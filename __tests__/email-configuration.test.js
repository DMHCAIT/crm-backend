const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEmailService(env) {
  const transports = [];
  const warnings = [];
  const sent = [];
  const context = {
    module: { exports: {} },
    process: { env },
    require(name) {
      if (name === 'nodemailer') return {
        createTransport(options) {
          transports.push(options);
          return {
            verify(callback) { callback(null); },
            async sendMail(mail) {
              sent.push(mail);
              return { messageId: 'test-message' };
            }
          };
        }
      };
      if (name === '@sendgrid/mail') return {
        setApiKey() {},
        async send(mail) { sent.push(mail); }
      };
      if (name === '../utils/logger') return {
        info() {}, error() {}, warn(message) { warnings.push(message); }
      };
      throw new Error(`Unexpected dependency: ${name}`);
    }
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', 'services', 'emailService.js'), 'utf8'),
    context
  );
  return { service: context.module.exports, transports, warnings, sent };
}

test('missing SMTP credentials warn without connecting and sends reject', async () => {
  for (const env of [{}, { SMTP_USER: 'test@example.com' }, { SMTP_PASS: 'test-only' }]) {
    const { service, transports, warnings } = loadEmailService(env);
    assert.equal(transports.length, 0);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /SMTP_USER and SMTP_PASS/);
    await assert.rejects(service.send({
      to: 'recipient@example.com', subject: 'Test', text: 'Test'
    }), /Email service not configured/);
  }
});

test('SMTP accepts both password names and prefers SMTP_PASS', async () => {
  for (const credentials of [
    { SMTP_PASS: 'canonical-test' },
    { SMTP_PASSWORD: 'legacy-test' },
    { SMTP_PASS: 'canonical-test', SMTP_PASSWORD: 'legacy-test' }
  ]) {
    const { service, transports, warnings } = loadEmailService({
      SMTP_USER: 'test@example.com', SMTP_PORT: '465', SMTP_SECURE: 'true',
      ...credentials
    });
    assert.equal(warnings.length, 0);
    assert.equal(transports.length, 1);
    assert.equal(transports[0].auth.pass, credentials.SMTP_PASS || credentials.SMTP_PASSWORD);
    assert.equal(transports[0].port, 465);
    assert.equal(transports[0].secure, true);
    const result = await service.send({
      to: 'recipient@example.com', subject: 'Test', text: 'Test'
    });
    assert.equal(result.success, true);
  }
});

test('SendGrid remains usable without SMTP credentials', async () => {
  const { service, transports, sent } = loadEmailService({
    EMAIL_PROVIDER: 'sendgrid', SENDGRID_API_KEY: 'test-only'
  });
  const result = await service.send({
    to: 'recipient@example.com', subject: 'Test', text: 'Test'
  });
  assert.equal(result.provider, 'SendGrid');
  assert.equal(transports.length, 0);
  assert.equal(sent.length, 1);
});

function loadScheduledExports(env, send) {
  const clients = [];
  const router = { get() {}, post() {}, put() {}, delete() {} };
  const context = {
    module: { exports: {} },
    process: { env },
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === '../services/emailService') return { send };
      if (name === '@supabase/supabase-js') return {
        createClient(url, key) {
          clients.push({ url, key });
          return {
            from() { return this; },
            select() { return this; },
            async eq() { return { data: [], error: null }; }
          };
        }
      };
      if (name === 'jsonwebtoken' || name === 'node-cron') return {};
      if (name === '../utils/logger') return { info() {}, error() {} };
      throw new Error(`Unexpected dependency: ${name}`);
    }
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'scheduled-exports.js'), 'utf8');
  vm.runInNewContext(source + '\nmodule.exports = { sendExportEmail };', context);
  return { sendExportEmail: context.module.exports.sendExportEmail, clients };
}

test('scheduled exports use the canonical database key with legacy compatibility', () => {
  for (const credentials of [
    { SUPABASE_SERVICE_KEY: 'canonical-test' },
    { SUPABASE_KEY: 'legacy-test' },
    { SUPABASE_SERVICE_KEY: 'canonical-test', SUPABASE_KEY: 'legacy-test' }
  ]) {
    const { clients } = loadScheduledExports({ SUPABASE_URL: 'test-url', ...credentials });
    assert.equal(clients.length, 1);
    assert.equal(clients[0].key, credentials.SUPABASE_SERVICE_KEY || credentials.SUPABASE_KEY);
  }
});

test('scheduled exports deliver CSV through the shared email service and propagate delivery errors', async () => {
  const messages = [];
  const { sendExportEmail } = loadScheduledExports({}, async mail => { messages.push(mail); });
  assert.equal(await sendExportEmail('recipient@example.com', 'leads', 'csv', [{ id: 'lead-test' }]), true);
  assert.equal(messages[0].to, 'recipient@example.com');
  assert.equal(messages[0].attachments[0].content, 'id\nlead-test');
  const failed = loadScheduledExports({}, async () => { throw new Error('Email service not configured'); });
  await assert.rejects(
    failed.sendExportEmail('recipient@example.com', 'leads', 'csv', []),
    /Email service not configured/
  );
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, logger } = require('../test-support/isolated-module');

function fixture(provider = 'smtp') {
  const messages = [];
  const keys = [];
  const deliver = async mail => {
    if (!mail.to) throw new Error('No recipients defined');
    if (mail.to === 'failure@example.com') throw new Error('Delivery failed');
    messages.push(mail);
    return { messageId: 'test-message-id' };
  };
  const service = loadModule('services/emailService.js', {
    nodemailer: {
      createTransport() { return { verify(callback) { callback(null); }, sendMail: deliver }; }
    },
    '@sendgrid/mail': { setApiKey(key) { keys.push(key); }, send: deliver },
    '../utils/logger': logger
  }, {
    EMAIL_PROVIDER: provider, SMTP_USER: 'test@example.com', SMTP_PASS: 'test-only',
    SENDGRID_API_KEY: 'test-only', EMAIL_FROM: 'sender@example.com'
  });
  return { service, messages, keys };
}

test('email sends SMTP fields, defaults and attachments and returns the message ID', async () => {
  const { service, messages } = fixture();
  const attachments = [{ filename: 'report.csv', content: 'id\n1' }];
  const result = await service.send({ to: 'test@example.com', subject: 'Test Email', text: 'Test content', attachments });
  assert.equal(result.success, true);
  assert.equal(result.provider, 'SMTP');
  assert.equal(result.messageId, 'test-message-id');
  assert.equal(messages[0].from, 'sender@example.com');
  assert.equal(messages[0].html, 'Test content');
  assert.deepEqual(messages[0].attachments, attachments);
  await service.send({ to: 'test@example.com', subject: 'Override', from: 'override@example.com', html: '<p>HTML</p>' });
  assert.equal(messages[1].from, 'override@example.com');
  assert.equal(messages[1].html, '<p>HTML</p>');
});

test('email propagates provider validation and delivery errors', async () => {
  for (const provider of ['smtp', 'sendgrid']) {
    const { service } = fixture(provider);
    await assert.rejects(service.send({ subject: 'No recipient' }), /No recipients defined/);
    await assert.rejects(service.send({ to: 'failure@example.com' }), /Delivery failed/);
  }
});

test('email sends through SendGrid with its configured key', async () => {
  const { service, messages, keys } = fixture('sendgrid');
  assert.deepEqual(keys, ['test-only']);
  const result = await service.send({ to: 'test@example.com', subject: 'Test', text: 'Content' });
  assert.equal(result.success, true);
  assert.equal(result.provider, 'SendGrid');
  assert.equal(messages[0].html, 'Content');
});

const templates = [
  ['welcome', { name: 'John Doe', loginUrl: 'https://example.com/login' }, 'Welcome to DMHCA CRM', ['John Doe', 'https://example.com/login']],
  ['leadAssigned', { leadName: 'ABC Corp', leadId: '123', leadEmail: 'lead@example.com', leadPhone: '123456', leadSource: 'Website', crmUrl: 'https://example.com' }, 'New Lead Assigned: ABC Corp', ['ABC Corp', 'lead@example.com', '123456', 'Website', 'https://example.com/leads/123']],
  ['leadStatusChange', { leadName: 'ABC Corp', oldStatus: 'New', newStatus: 'Qualified', updatedBy: 'Jane Smith', leadId: '123', crmUrl: 'https://example.com' }, 'Lead Status Updated: ABC Corp', ['New', 'Qualified', 'Jane Smith', 'https://example.com/leads/123']],
  ['passwordReset', { resetUrl: 'https://example.com/reset?token=test-only' }, 'Password Reset Request - DMHCA CRM', ['https://example.com/reset?token=test-only', '1 hour']],
  ['dailyReport', { date: '2026-01-15', newLeads: 5, convertedLeads: 2, revenue: 50000, activeUsers: 3, crmUrl: 'https://example.com' }, 'Daily CRM Report - 2026-01-15', ['New Leads: 5', 'Converted Leads: 2', '50000', 'Active Users: 3', 'https://example.com/dashboard']]
];

for (const [name, data, subject, content] of templates) {
  test(`email ${name} template uses the actual data contract`, async () => {
    const { service, messages } = fixture();
    const result = await service.sendTemplate(name, { to: 'recipient@example.com', ...data });
    assert.equal(result.success, true);
    assert.equal(messages[0].to, 'recipient@example.com');
    assert.equal(messages[0].subject, subject);
    for (const text of content) assert.ok(messages[0].html.includes(text), text);
    assert.ok(!messages[0].html.includes('undefined'));
  });
}

test('email rejects unknown templates without sending', async () => {
  const { service, messages } = fixture();
  await assert.rejects(service.sendTemplate('invalidTemplate', { to: 'recipient@example.com' }), /Unknown email template: invalidTemplate/);
  assert.equal(messages.length, 0);
});

test('email bulk delivery returns every success and continues after partial failure', async () => {
  const { service, messages } = fixture();
  const results = await service.sendBulk([
    { to: 'user1@example.com', subject: 'Test 1' },
    { subject: 'Missing recipient' },
    { to: 'failure@example.com', subject: 'Fails' },
    { to: 'user2@example.com', subject: 'Test 2' }
  ]);
  assert.equal(results.length, 4);
  assert.equal(results[0].success, true);
  assert.equal(results[0].to, 'user1@example.com');
  assert.equal(results[1].success, false);
  assert.equal(results[1].error, 'No recipients defined');
  assert.equal(results[2].success, false);
  assert.equal(results[2].error, 'Delivery failed');
  assert.equal(results[3].success, true);
  assert.equal(messages.length, 2);
});

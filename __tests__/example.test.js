const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { loadServer, loadModule, response } = require('../test-support/isolated-module');

test('home route advertises the backend API with a timestamp and environment', async () => {
  const server = loadServer({ NODE_ENV: 'test' });
  const res = await server.request('GET', '/');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'DMHCA CRM Backend API');
  assert.equal(res.body.version, '2.0.0');
  assert.equal(res.body.environment, 'test');
  assert.ok(Number.isFinite(Date.parse(res.body.timestamp)));
});

test('server registers user API routes at /api/users, not obsolete /users endpoints', async () => {
  const server = loadServer();
  for (const method of ['GET', 'POST']) {
    const res = await server.request(method, '/api/users');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  }
});

test('server route diagnostics report all handlers registered using mocked module boundaries', async () => {
  const server = loadServer();
  const res = await server.request('GET', '/api/debug/routes');
  assert.deepEqual(res.body.loadedHandlers, server.handlers);
  assert.equal(res.body.loadedHandlers.length, 37);
  assert.deepEqual(res.body.failedHandlers, []);
});

function usersFixture({ duplicate = false } = {}) {
  const calls = [];
  const existing = { id: 'existing-user', email: 'existing@example.com', name: 'Existing', username: 'existing', role: 'counselor' };
  const secret = 'isolated-users-test-secret';
  const handler = loadModule('api/users.js', {
    '@supabase/supabase-js': {
      createClient: () => ({
        from(table) {
          let selection;
          let inserted;
          const query = {
            select(columns, options) { selection = columns; calls.push(['select', table, columns, options]); return this; },
            order() { return this; },
            limit() { return this; },
            eq(column, value) { calls.push(['eq', table, column, value]); return this; },
            or(filter) { calls.push(['or', filter]); return this; },
            insert(rows) { inserted = rows[0]; calls.push(['insert', inserted]); return this; },
            async single() {
              if (!inserted) return { data: duplicate ? existing : null, error: null };
              const data = Object.fromEntries(selection.split(', ').map(column => [column, inserted[column]]));
              return { data, error: null };
            },
            then(resolve, reject) {
              const result = table === 'users'
                ? { data: [existing], error: null }
                : selection === 'status'
                  ? { data: [{ status: 'Fresh' }, { status: 'enrolled' }], error: null }
                  : { count: 2, error: null };
              return Promise.resolve(result).then(resolve, reject);
            }
          };
          return query;
        }
      })
    },
    jsonwebtoken: jwt,
    bcrypt: { async hash(password, rounds) { calls.push(['hash', password, rounds]); return 'mock-password-hash'; } },
    uuid: { v4: () => 'created-user' },
    '../utils/reportingHierarchy': require('../utils/reportingHierarchy')
  }, { SUPABASE_URL: 'https://isolated.invalid', SUPABASE_SERVICE_KEY: 'test-only', JWT_SECRET: secret });
  return {
    calls,
    async request(method, body = {}, role = 'admin') {
      const res = response();
      await handler({
        method, path: '/api/users', url: '/api/users', body, query: {},
        headers: { authorization: `Bearer ${jwt.sign({ id: 'admin-123', role }, secret)}` }
      }, res);
      return res;
    }
  };
}

test('users API lists users with assigned lead counts for authenticated administrators', async () => {
  const { request, calls } = usersFixture();
  const res = await request('GET');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.users.length, 1);
  assert.equal(res.body.users[0].username, 'existing');
  assert.equal(res.body.users[0].totalLeads, 2);
  assert.equal(res.body.users[0].activeLeads, 1);
  assert.equal(res.body.users[0].leadsByStatus.fresh, 1);
  assert.equal(res.body.users[0].leadsByStatus.enrolled, 1);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'leads' && call[2] === 'assignedTo' && call[3] === 'existing'));
});

test('users API creates a complete user and returns its actual 200 response contract', async () => {
  const { request, calls } = usersFixture();
  const input = { email: 'new@example.com', password: 'test-only', name: 'John Doe', username: 'john', role: 'counselor' };
  const res = await request('POST', input);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.id, 'created-user');
  assert.equal(res.body.user.name, 'John Doe');
  assert.equal(res.body.user.username, 'john');
  assert.equal(res.body.user.status, 'active');
  assert.equal(res.body.user.password_hash, undefined);
  assert.deepEqual(calls.find(call => call[0] === 'hash'), ['hash', 'test-only', 10]);
  const inserted = calls.find(call => call[0] === 'insert')[1];
  assert.equal(inserted.password_hash, 'mock-password-hash');
  assert.equal(inserted.password, undefined);
  assert.ok(Number.isFinite(Date.parse(inserted.created_at)));
});

test('users API rejects incomplete and duplicate users without hashing or inserting', async () => {
  const incomplete = usersFixture();
  const invalid = await incomplete.request('POST', { name: 'John Doe' });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.body.message, /required/);
  assert.ok(!incomplete.calls.some(call => ['insert', 'hash'].includes(call[0])));
  const duplicate = usersFixture({ duplicate: true });
  const existing = await duplicate.request('POST', { email: 'existing@example.com', password: 'test-only', name: 'Existing', username: 'existing' });
  assert.equal(existing.statusCode, 400);
  assert.match(existing.body.message, /already exists/);
  assert.ok(!duplicate.calls.some(call => ['insert', 'hash'].includes(call[0])));
});

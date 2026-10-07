const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'leads.js'), 'utf8');
const users = [
  { id: 'leader-id', username: 'leader', reports_to: null },
  { id: 'member-id', username: 'member', reports_to: 'leader-id' },
  { id: 'nested-id', username: 'nested', reports_to: 'member-id' },
  { id: 'outsider-id', username: 'outsider', reports_to: null }
];

async function transfer({
  ids = ['lead-1', 'lead-2'],
  target = 'member',
  role = 'team_leader',
  token = true,
  operationType = 'transfer',
  rows = [
    { id: 'lead-1', assignedTo: 'leader' },
    { id: 'lead-2', assignedTo: 'member' }
  ],
  hierarchyError = false,
  failBatch = 0,
  concurrentChange = false
} = {}) {
  let writes = 0;
  const client = {
    from(table) {
      const filters = [];
      let updates;
      const query = {
        select() { return this; },
        order() { return this; },
        range() { return this; },
        in(key, values) { filters.push(row => values.includes(row[key])); return this; },
        update(value) { updates = value; return this; },
        then(resolve, reject) {
          if (table === 'users') {
            return Promise.resolve({
              data: hierarchyError ? null : users,
              error: hierarchyError ? new Error('Hierarchy unavailable') : null
            }).then(resolve, reject);
          }
          let selected = rows.filter(row => filters.every(filter => filter(row)));
          if (updates) {
            writes++;
            if (writes === failBatch) {
              return Promise.resolve({ data: null, error: new Error('Write failed') }).then(resolve, reject);
            }
            if (concurrentChange) selected = selected.slice(1);
            selected.forEach(row => Object.assign(row, updates));
          }
          return Promise.resolve({ data: selected.map(row => ({ ...row })), error: null }).then(resolve, reject);
        }
      };
      return query;
    }
  };
  const context = {
    module: { exports: {} },
    process: { env: { JWT_SECRET: 'test-only', SUPABASE_URL: 'test', SUPABASE_SERVICE_KEY: 'test' } },
    console: { log() {}, error() {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'jsonwebtoken') return { verify: () => ({ username: 'leader', role }) };
      if (name === '../utils/reportingHierarchy') return require('../utils/reportingHierarchy');
      throw new Error(`Unexpected dependency: ${name}`);
    }
  };
  vm.runInNewContext(source, context);
  const response = {
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await context.module.exports({
    path: '/api/leads',
    method: 'POST',
    headers: token ? { authorization: 'Bearer test-token' } : {},
    query: {},
    body: { operation: 'bulk_update', operationType, leadIds: ids, updateData: { assignedTo: target } }
  }, response);
  return { response, rows, writes };
}

test('team leaders transfer multiple leads to direct and nested team members or themselves', async () => {
  for (const target of ['member', 'nested', 'leader']) {
    const { response, rows } = await transfer({ target });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.count, 2);
    assert.ok(rows.every(row => row.assignedTo === target));
  }
});

test('selection size is not capped at a page or the database default row limit', async () => {
  const rows = Array.from({ length: 1205 }, (_, index) => ({ id: `lead-${index}`, assignedTo: 'leader' }));
  const { response, writes } = await transfer({ rows, ids: rows.map(row => row.id) });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.count, 1205);
  assert.equal(writes, 7);
  assert.ok(rows.every(row => row.assignedTo === 'member'));
});

test('outside-team recipients are rejected even without the transfer operation label', async () => {
  for (const operationType of ['transfer', 'update']) {
    const { response, writes } = await transfer({ target: 'outsider', operationType });
    assert.equal(response.statusCode, 403);
    assert.equal(writes, 0);
  }
});

test('outside-team or nonexistent leads reject the entire selection before writing', async () => {
  for (const ids of [['lead-1', 'outside'], ['lead-1', 'missing']]) {
    const { response, writes } = await transfer({
      ids,
      rows: [{ id: 'lead-1', assignedTo: 'leader' }, { id: 'outside', assignedTo: 'outsider' }]
    });
    assert.equal(response.statusCode, 403);
    assert.equal(writes, 0);
  }
});

test('empty and invalid selections are rejected, while duplicates transfer once', async () => {
  for (const ids of [[], [''], [123]]) {
    const { response, writes } = await transfer({ ids });
    assert.equal(response.statusCode, 400);
    assert.equal(writes, 0);
  }
  const { response } = await transfer({ ids: ['lead-1', 'lead-1'] });
  assert.equal(response.body.count, 1);
});

test('missing authentication and hierarchy failures cannot write leads', async () => {
  const unauthenticated = await transfer({ token: false });
  assert.equal(unauthenticated.response.statusCode, 401);
  assert.equal(unauthenticated.writes, 0);
  const unavailable = await transfer({ hierarchyError: true });
  assert.equal(unavailable.response.statusCode, 500);
  assert.equal(unavailable.writes, 0);
});

test('failed batches and concurrent ownership changes report failure, not success', async () => {
  const rows = Array.from({ length: 201 }, (_, index) => ({ id: `lead-${index}`, assignedTo: 'leader' }));
  const failed = await transfer({ rows, ids: rows.map(row => row.id), failBatch: 2 });
  assert.equal(failed.response.statusCode, 500);
  assert.equal(failed.response.body.success, false);
  assert.equal(failed.response.body.count, 200);
  const changed = await transfer({ concurrentChange: true });
  assert.equal(changed.response.statusCode, 409);
  assert.equal(changed.response.body.success, false);
});

test('existing manager and admin transfer behavior is preserved', async () => {
  for (const role of ['manager', 'senior_manager', 'admin', 'super_admin']) {
    const { response } = await transfer({ role, target: 'outsider' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.count, 2);
  }
});

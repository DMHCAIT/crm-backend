const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const hierarchy = require('../utils/reportingHierarchy');

const users = [
  { id: 'senior', username: 'senior', fullName: 'Senior', role: 'senior_manager', reports_to: null },
  { id: 'manager', username: 'manager', fullName: 'Manager', role: 'manager', reports_to: 'senior' },
  { id: 'leader', username: 'leader', fullName: 'Leader', role: 'team_leader', reports_to: 'manager' },
  { id: 'member', username: 'member', fullName: 'Member', role: 'counselor', reports_to: 'leader' },
  { id: 'other-leader', username: 'other-leader', fullName: 'Other Leader', role: 'team_leader', reports_to: null },
  { id: 'other-member', username: 'other-member', fullName: 'Other Member', role: 'counselor', reports_to: 'other-leader' }
];
const leads = users.map(user => ({ id: `lead-${user.id}`, assignedTo: user.username, notes: [] }));

function database(userRows = users, leadRows = leads, failure = false) {
  return {
    from(table) {
      const filters = [];
      let start = 0;
      let end = Infinity;
      const query = {
        select() { return this; },
        order() { return this; },
        range(first, last) { start = first; end = last; return this; },
        limit(count) { end = count - 1; return this; },
        eq(key, value) { filters.push(row => row[key] === value); return this; },
        in(key, values) { filters.push(row => values.includes(row[key])); return this; },
        then(resolve, reject) {
          if (failure) return Promise.resolve({ data: null, error: new Error('Database unavailable') }).then(resolve, reject);
          const rows = (table === 'users' ? userRows : leadRows).filter(row => filters.every(filter => filter(row)));
          return Promise.resolve({ data: rows.slice(start, end + 1), error: null, count: rows.length }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

async function request(moduleName, viewer, { url = '/api/leads', query = {}, client = database(), authenticated = true } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'api', moduleName + '.js'), 'utf8');
  const context = {
    module: { exports: {} },
    process: { env: { JWT_SECRET: 'test-only', SUPABASE_URL: 'test', SUPABASE_SERVICE_KEY: 'test' } },
    console: { log() {}, error() {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'jsonwebtoken') return { verify: () => viewer };
      if (name === '../utils/reportingHierarchy') return hierarchy;
      if (name === '../utils/logger') return { info() {}, error() {} };
      if (name === 'bcrypt') return {};
      if (name === 'uuid') return { v4() {} };
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
    path: url, method: 'GET', query,
    headers: authenticated ? { authorization: 'Bearer test-token' } : {}
  }, response);
  return response;
}

function ids(rows) {
  return Array.from(rows, row => row.id).sort();
}

test('main and fallback lead lists show every reporting descendant for leadership roles', async () => {
  for (const moduleName of ['leads', 'leads-simple']) {
    for (const [userId, expected] of [
      ['senior', ['senior', 'manager', 'leader', 'member']],
      ['manager', ['manager', 'leader', 'member']],
      ['leader', ['leader', 'member']],
      ['member', ['member']]
    ]) {
      const result = await request(moduleName, users.find(user => user.id === userId));
      assert.equal(result.statusCode, 200);
      assert.deepEqual(ids(result.body.leads), expected.map(id => 'lead-' + id).sort());
    }
  }
});

test('assignable-user lists show only the recursive reporting team, with supervisor metadata', async () => {
  for (const userId of ['senior', 'manager', 'leader']) {
    const current = users.find(user => user.id === userId);
    const result = await request('assignable-users', current);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(ids(result.body.users), ids([current, ...hierarchy.getReportingTeam(userId, users)]));
    assert.equal(result.body.users.find(user => user.id === 'member').reports_to, 'leader');
  }
});

test('manager and senior-manager drill-downs include team leaders and their members', async () => {
  for (const viewer of users.filter(user => ['manager', 'senior'].includes(user.id))) {
    const result = await request('users', viewer, {
      url: '/api/users/leader/leads', query: { includeTeam: 'true' }
    });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(ids(result.body.leads), ['lead-leader', 'lead-member']);
    const own = await request('users', viewer, {
      url: '/api/users/leader/leads', query: { includeTeam: 'false' }
    });
    assert.deepEqual(ids(own.body.leads), ['lead-leader']);
  }
  const senior = await request('users', users[0], {
    url: '/api/users/senior/leads', query: { includeTeam: 'true' }
  });
  assert.deepEqual(ids(senior.body.leads), ['lead-leader', 'lead-manager', 'lead-member', 'lead-senior']);
});

test('subordinate endpoint uses reports_to recursively, not manager_id', async () => {
  const result = await request('users', users[0], { url: '/api/users/manager/subordinates' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(ids(result.body.data), ['leader', 'member']);
});

test('team drill-downs reject anonymous users and unrelated teams', async () => {
  for (const suffix of ['leads', 'subordinates']) {
    const unauthorized = await request('users', users[1], {
      url: '/api/users/leader/' + suffix, authenticated: false
    });
    assert.equal(unauthorized.statusCode, 401);
    const forbidden = await request('users', users[1], { url: '/api/users/other-leader/' + suffix });
    assert.equal(forbidden.statusCode, 403);
  }
});

test('admins retain all-team lead and user visibility', async () => {
  for (const role of ['admin', 'super_admin']) {
    const viewer = { id: 'admin', username: 'admin', role };
    const result = await request('leads', viewer);
    assert.deepEqual(ids(result.body.leads), ids(leads));
    const assignable = await request('assignable-users', { ...users[0], role }, {
      client: database([{ ...users[0], role }, ...users.slice(1)])
    });
    assert.deepEqual(ids(assignable.body.users), ids(users));
  }
});

test('hierarchy lookup supports old JWTs and handles cycles without duplicates', async () => {
  const result = await hierarchy.getAccessibleUsernames(database(), { email: 'manager@example.invalid', role: 'manager' })
    .catch(error => error);
  assert.match(result.message, /not found/);
  assert.deepEqual(await hierarchy.getAccessibleUsernames(database(), { username: 'manager', role: 'manager' }),
    ['manager', 'leader', 'member']);
  const emailUsers = users.map(user => ({ ...user, email: `${user.username}@example.invalid` }));
  assert.deepEqual(await hierarchy.getAccessibleUsernames(database(emailUsers), { email: 'manager@example.invalid', role: 'manager' }),
    ['manager', 'leader', 'member']);
  assert.deepEqual(await hierarchy.getAccessibleUsernames(database(), { userId: 'manager', role: 'manager' }),
    ['manager', 'leader', 'member']);
  const cyclic = [{ id: 'a', reports_to: 'b' }, { id: 'b', reports_to: 'a' }];
  assert.deepEqual(ids(hierarchy.getReportingTeam('a', cyclic)), ['b']);
});

test('large hierarchies and team drill-downs are not truncated at 1000 rows', async () => {
  const members = Array.from({ length: 1205 }, (_, index) => ({
    id: `member-${index}`, username: `member-${index}`, role: 'counselor', reports_to: 'leader'
  }));
  const teamLeads = members.map(user => ({ id: `lead-${user.id}`, assignedTo: user.username }));
  const client = database([...users, ...members], teamLeads);
  const names = await hierarchy.getAccessibleUsernames(client, users[1]);
  assert.equal(names.length, 1208);
  const result = await request('users', users[1], {
    client, url: '/api/users/leader/leads', query: { includeTeam: 'true' }
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.leads.length, 1205);
});

test('database failures are explicit errors, not empty successful team views', async () => {
  for (const moduleName of ['leads', 'leads-simple', 'assignable-users', 'users']) {
    const result = await request(moduleName, users[1], {
      client: database(users, leads, true),
      url: moduleName === 'users' ? '/api/users/leader/leads' : '/api/leads',
      query: { includeTeam: 'true' }
    });
    assert.equal(result.statusCode, 500);
    assert.equal(result.body.success, false);
  }
});

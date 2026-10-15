const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { normalizeCallTime, isActiveCall } = require('../utils/callSchedule');

const due = '2099-01-01T12:00:00.000Z';
const originalUpdate = '2099-01-01T11:00:00.000Z';
const makeLead = (id, assignedTo = 'member', overrides = {}) => ({
  id, fullName: `Lead ${id}`, assignedTo, scheduledCallAt: due,
  scheduledCallDismissedAt: null, updatedAt: originalUpdate, ...overrides
});

function database(rows, failure = false) {
  return {
    from() {
      const filters = [];
      let first = 0;
      let last = Infinity;
      let changes;
      const query = {
        select() { return this; },
        order() { return this; },
        range(start, end) { first = start; last = end; return this; },
        eq(key, value) {
          filters.push(row => key === 'scheduledCallAt' ?
            Date.parse(row[key]) === Date.parse(value) : row[key] === value);
          return this;
        },
        in(key, values) { filters.push(row => values.includes(row[key])); return this; },
        is(key, value) { filters.push(row => (row[key] ?? null) === value); return this; },
        not(key) { filters.push(row => row[key] != null); return this; },
        update(data) { changes = data; return this; },
        insert(data) {
          const inserted = data.map((row, index) => ({
            id: `created-${index}`, updatedAt: new Date().toISOString(), ...row
          }));
          rows.push(...inserted);
          filters.push(row => inserted.includes(row));
          return this;
        },
        result(single = false) {
          if (failure) return { data: null, error: new Error('Missing scheduled call columns') };
          const selected = rows.filter(row => filters.every(filter => filter(row))).slice(first, last + 1);
          if (changes) selected.forEach(row => Object.assign(row, changes));
          return { data: single ? selected[0] || null : selected, error: null };
        },
        async maybeSingle() { return this.result(true); },
        async single() { return this.result(true); },
        then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
      };
      return query;
    }
  };
}

async function request(rows, { method = 'GET', body, viewer = { id: 'member', username: 'member', role: 'counselor' },
  accessible = ['member'], authenticated = true, failure = false, query = {} } = {}) {
  const context = {
    module: { exports: {} },
    process: { env: { JWT_SECRET: 'test-only', SUPABASE_URL: 'test-url', SUPABASE_SERVICE_KEY: 'test-only' } },
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => database(rows, failure) };
      if (name === 'jsonwebtoken') return { verify: () => viewer };
      if (name === '../utils/reportingHierarchy') return {
        getAccessibleUsernames: async () => accessible,
        getOwnUsername: async () => {
          if (!viewer.username) throw new Error('Current user has no lead assignment username');
          return viewer.username;
        }
      };
      if (name === '../utils/callSchedule') return { normalizeCallTime, isActiveCall };
      if (name === '../utils/leadDuplicates') return {
        ...require('../utils/leadDuplicates'),
        resolveLeadAssignee: async () => viewer.username,
        findContactMatches: async () => []
      };
      throw new Error(`Unexpected dependency: ${name}`);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'api', 'leads.js'), 'utf8'), context);
  const response = {
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
  await context.module.exports({
    path: method === 'GET' ? '/api/leads/call-reminders' : '/api/leads',
    method, query, body,
    headers: authenticated ? { authorization: 'Bearer test-only' } : {}
  }, response);
  return response;
}

test('call times require a timezone, normalize to UTC, and can be cleared', () => {
  assert.equal(normalizeCallTime('2099-01-01T17:30:00+05:30'), due);
  assert.equal(normalizeCallTime(null), null);
  assert.equal(normalizeCallTime(''), null);
  for (const value of ['invalid', '2099-01-01', '2099-01-01T12:00', '2099-02-30T12:00:00Z', 123, undefined]) {
    assert.throws(() => normalizeCallTime(value), /valid date and time/);
  }
});

test('updates before the call do not clear it; updates at or after the call and dismissal do', () => {
  assert.equal(isActiveCall(makeLead('1')), true);
  assert.equal(isActiveCall(makeLead('1', 'member', { updatedAt: due })), false);
  assert.equal(isActiveCall(makeLead('1', 'member', { updatedAt: '2099-01-01T12:01:00Z' })), false);
  assert.equal(isActiveCall(makeLead('1', 'member', { scheduledCallDismissedAt: due })), false);
  assert.equal(isActiveCall(makeLead('1', 'member', { scheduledCallAt: null })), false);
});

test('reminders require authentication and surface database errors', async () => {
  assert.equal((await request([], { authenticated: false })).statusCode, 401);
  const result = await request([], { failure: true });
  assert.equal(result.statusCode, 500);
  assert.match(result.body.error, /migration/);
});

test('all dashboard roles receive only their own assigned calls, including beyond page 500', async () => {
  const rows = Array.from({ length: 1001 }, (_, index) => makeLead(String(index)));
  rows.push(makeLead('unrelated', 'other'));
  rows.push(makeLead('dismissed', 'member', { scheduledCallDismissedAt: due }));
  rows.push(makeLead('updated', 'member', { updatedAt: due }));
  for (const role of ['counselor', 'team_leader', 'manager', 'senior_manager', 'super_admin', 'admin']) {
    const result = await request(rows, {
      viewer: { id: 'viewer', username: 'member', role }, accessible: ['supervisor', 'member', 'other']
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.leads.length, 1001);
    assert.equal(result.body.leads.some(lead => lead.id === 'dismissed' || lead.id === 'updated'), false);
  }
});

test('Akash receives his calls but supervisors and super admins do not', async () => {
  const rows = [makeLead('akash-call', 'Akash'), makeLead('admin-call', 'superadmin')];
  const akash = await request(rows, { viewer: { id: 'akash', username: 'Akash', role: 'counselor' } });
  assert.deepEqual(Array.from(akash.body.leads, lead => lead.id), ['akash-call']);
  for (const role of ['team_leader', 'manager', 'senior_manager', 'super_admin', 'admin']) {
    const result = await request(rows, {
      viewer: { id: 'supervisor', username: 'supervisor', role }, accessible: null
    });
    assert.equal(result.body.leads.length, 0);
    const dismiss = await request(rows, {
      method: 'POST', viewer: { id: 'supervisor', username: 'supervisor', role }, accessible: null,
      body: { operation: 'dismiss_call', leadId: 'akash-call', scheduledCallAt: due }
    });
    assert.equal(dismiss.statusCode, 409);
    assert.equal(rows[0].scheduledCallDismissedAt, null);
  }
  const admin = await request(rows, {
    viewer: { id: 'admin', username: 'superadmin', role: 'super_admin' }, accessible: null
  });
  assert.deepEqual(Array.from(admin.body.leads, lead => lead.id), ['admin-call']);
});

test('follow-up date alone never produces a scheduled call popup', async () => {
  const result = await request([makeLead('follow-up', 'member', { scheduledCallAt: null, followUp: due })]);
  assert.equal(result.body.leads.length, 0);
});

test('reassigning a lead moves its popup to the new assigned user', async () => {
  const rows = [makeLead('assigned-call', 'Akash')];
  rows[0].assignedTo = 'new-owner';
  const previousOwner = await request(rows, {
    viewer: { id: 'akash', username: 'Akash', role: 'counselor' }
  });
  const newOwner = await request(rows, {
    viewer: { id: 'new-owner', username: 'new-owner', role: 'manager' }, accessible: null
  });
  assert.equal(previousOwner.body.leads.length, 0);
  assert.deepEqual(Array.from(newOwner.body.leads, lead => lead.id), ['assigned-call']);
});

test('dismissal persists across reads without changing follow-up/update timestamps', async () => {
  const rows = [makeLead('1', 'member', { followUp: due })];
  const result = await request(rows, {
    method: 'POST', body: { operation: 'dismiss_call', leadId: '1', scheduledCallAt: due }
  });
  assert.equal(result.statusCode, 200);
  assert.ok(rows[0].scheduledCallDismissedAt);
  assert.equal(rows[0].updatedAt, originalUpdate);
  assert.equal(rows[0].followUp, due);
  assert.equal((await request(rows)).body.leads.length, 0);
});

test('stale, inaccessible, unauthenticated and invalid dismissals do not change schedules', async () => {
  for (const overrides of [
    { viewer: { id: 'other', username: 'other', role: 'super_admin' }, accessible: null },
    { authenticated: false },
    { body: { operation: 'dismiss_call', leadId: '1', scheduledCallAt: '2099-01-02T12:00:00Z' } },
    { body: { operation: 'dismiss_call', leadId: '1', scheduledCallAt: 'invalid' } }
  ]) {
    const rows = [makeLead('1')];
    const result = await request(rows, {
      method: 'POST', body: { operation: 'dismiss_call', leadId: '1', scheduledCallAt: due }, ...overrides
    });
    assert.ok(result.statusCode >= 400);
    assert.equal(rows[0].scheduledCallDismissedAt, null);
  }
});

test('rescheduling enables a new reminder; ordinary saves preserve dismissal; clearing cancels', async () => {
  const rows = [makeLead('1', 'member', { scheduledCallDismissedAt: due })];
  const unchanged = await request(rows, {
    method: 'PUT', query: { id: '1' }, body: { scheduledCallAt: due, scheduledCallDismissedAt: null }
  });
  assert.equal(unchanged.statusCode, 200);
  assert.equal(rows[0].scheduledCallDismissedAt, due);
  const changed = await request(rows, {
    method: 'PUT', query: { id: '1' }, body: { scheduledCallAt: '2099-01-02T17:30:00+05:30' }
  });
  assert.equal(changed.statusCode, 200);
  assert.equal(rows[0].scheduledCallDismissedAt, null);
  assert.equal((await request(rows)).body.leads.length, 1);
  const cleared = await request(rows, {
    method: 'PUT', query: { id: '1' }, body: { scheduledCallAt: null }
  });
  assert.equal(cleared.statusCode, 200);
  assert.equal((await request(rows)).body.leads.length, 0);
});

test('invalid, past and inaccessible schedule updates are rejected without writing', async () => {
  for (const overrides of [
    { body: { scheduledCallAt: 'bad' } },
    { body: { scheduledCallAt: '2000-01-01T12:00:00Z' } },
    { accessible: ['other'] },
    { authenticated: false }
  ]) {
    const rows = [makeLead('1')];
    const result = await request(rows, {
      method: 'PUT', query: { id: '1' }, body: { scheduledCallAt: '2099-01-02T12:00:00Z' }, ...overrides
    });
    assert.ok(result.statusCode >= 400);
    assert.equal(rows[0].scheduledCallAt, due);
  }
});

test('new leads persist UTC call schedules and reject invalid or past call times', async () => {
  const rows = [];
  const result = await request(rows, {
    method: 'POST', body: {
      fullName: 'Scheduled new lead', email: 'schedule@example.invalid', phone: '+911234567890',
      scheduledCallAt: '2099-01-01T17:30:00+05:30'
    }
  });
  assert.equal(result.statusCode, 201);
  assert.equal(rows[0].scheduledCallAt, due);
  for (const scheduledCallAt of ['invalid', '2000-01-01T12:00:00Z']) {
    const rejectedRows = [];
    const rejected = await request(rejectedRows, {
      method: 'POST', body: { fullName: 'Invalid new lead', scheduledCallAt }
    });
    assert.equal(rejected.statusCode, 400);
    assert.equal(rejectedRows.length, 0);
  }
});

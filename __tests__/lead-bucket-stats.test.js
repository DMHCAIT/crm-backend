const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const hierarchy = require('../utils/reportingHierarchy');

const now = '2026-10-15T01:00:00.000Z';
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return Date.parse(now); }
}
const users = [
  { id: 'manager', username: 'manager', role: 'manager' },
  { id: 'leader', username: 'leader', role: 'team_leader', reports_to: 'manager' },
  { id: 'member', username: 'member', role: 'counselor', reports_to: 'leader' },
  { id: 'outside', username: 'outside', role: 'counselor' }
];
const statuses = ['Hot', 'Warm', 'Follow Up', 'Fresh', 'Enrolled'];
const timestamps = [
  '2026-10-15T00:00:00Z',
  '2026-10-14T18:29:59.999Z',
  '2026-10-14T18:30:00Z',
  '2026-10-13T18:29:59.999Z',
  '2026-10-08T00:00:00Z',
  '2026-09-30T18:29:59.999Z',
  '2026-09-30T18:30:00Z',
  null
];
const leads = users.flatMap(user => Array.from({ length: 1305 }, (_, index) => ({
  id: `${user.id}-${index}`,
  assignedTo: user.username,
  status: statuses[index % statuses.length],
  createdAt: timestamps[index % timestamps.length],
  updatedAt: timestamps[(index + 1) % timestamps.length],
  followUp: index % 3 ? null : (index % 2 ? '2026-10-15T00:30:00Z' : '2026-10-14T00:00:00Z')
})));

function database({ failCounts = false, nullCount = false, failOverdue = false } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const filters = [];
      let start = 0;
      let end = Infinity;
      let head = false;
      const query = {
        select(columns, options) {
          head = options?.head === true;
          calls.push({ table, columns, options });
          return this;
        },
        order() { return this; },
        range(first, last) { start = first; end = last; return this; },
        eq(key, value) { filters.push(row => row[key] === value); return this; },
        in(key, values) { filters.push(row => values.includes(row[key])); return this; },
        not(key, operator, value) {
          assert.equal(operator, 'is');
          assert.equal(value, null);
          filters.push(row => row[key] != null);
          return this;
        },
        gte(key, value) { filters.push(row => row[key] != null && Date.parse(row[key]) >= Date.parse(value)); return this; },
        lte(key, value) { filters.push(row => row[key] != null && Date.parse(row[key]) <= Date.parse(value)); return this; },
        lt(key, value) { filters.push(row => row[key] != null && Date.parse(row[key]) < Date.parse(value)); return this; },
        then(resolve, reject) {
          if (failOverdue && table === 'crm_overdue_leads') {
            return Promise.resolve({ data: null, count: null, error: new Error('Overdue view unavailable') }).then(resolve, reject);
          }
          if (head && failCounts) {
            return Promise.resolve({ count: null, error: new Error('Count unavailable') }).then(resolve, reject);
          }
          const source = table === 'users' ? users : table === 'crm_overdue_leads' ? leads.filter(row =>
            row.followUp && Date.parse(row.followUp) < Date.parse(now) &&
            !['Enrolled', 'Not Interested'].includes(row.status) &&
            (!row.updatedAt || Date.parse(row.updatedAt) <= Date.parse(row.followUp))) : leads;
          const rows = source.filter(row => filters.every(filter => filter(row)));
          return Promise.resolve({
            data: head ? null : rows.slice(start, end + 1),
            count: head && nullCount ? null : rows.length,
            error: null
          }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

async function request(viewer, query = {}, options = {}) {
  const client = options.client || database();
  const context = {
    module: { exports: {} },
    Date: options.clock || FixedDate,
    process: { env: { JWT_SECRET: 'test', SUPABASE_URL: 'test', SUPABASE_SERVICE_KEY: 'test' } },
    console: { log() {}, error() {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'jsonwebtoken') return { verify: () => viewer };
      if (name === '../utils/reportingHierarchy') return hierarchy;
      if (name === '../utils/callSchedule') return require('../utils/callSchedule');
      if (name === '../utils/leadDuplicates') return require('../utils/leadDuplicates');
      throw new Error(`Unexpected dependency ${name}`);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'api', 'leads.js'), 'utf8'), context);
  const response = {
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await context.module.exports({
    path: options.list ? '/api/leads' : '/api/leads/stats',
    method: 'GET', query, headers: viewer ? { authorization: 'Bearer test' } : {}
  }, response);
  return response;
}

test('all role buckets count every accessible lead, including beyond 1000 rows', async () => {
  for (const [viewer, expectedUsers] of [
    [users[2], ['member']],
    [users[1], ['leader', 'member']],
    [users[0], ['manager', 'leader', 'member']],
    [{ id: 'admin', role: 'admin' }, users.map(user => user.username)],
    [{ id: 'super', role: 'super_admin' }, users.map(user => user.username)]
  ]) {
    const client = database();
    const response = await request(viewer, { page: '2', pageSize: '50', status: 'Hot' }, { client });
    assert.equal(response.statusCode, 200);
    const visible = leads.filter(lead => expectedUsers.includes(lead.assignedTo));
    assert.equal(response.body.stats.total, visible.length);
    assert.equal(response.body.stats.totalLeads, visible.length);
    for (const [key, status] of Object.entries({ hot: 'Hot', warm: 'Warm', fresh: 'Fresh', followup: 'Follow Up', converted: 'Enrolled' })) {
      assert.equal(response.body.stats[key], visible.filter(lead => lead.status === status).length);
      assert.equal(response.body.stats.statusCounts[status], response.body.stats[key]);
    }
    assert.equal(response.body.stats.followUps, visible.filter(lead => lead.followUp).length);
    assert.ok(client.calls.filter(call => call.table === 'leads').every(call => call.options.head && call.options.count === 'exact'));
  }
});

test('lead detail ID filter returns only the exact accessible lead within each reporting bucket', async () => {
  for (const [viewer, accessibleId, inaccessibleId] of [
    [users[2], 'member-1304', 'leader-1304'],
    [users[1], 'member-1304', 'manager-1304'],
    [users[0], 'leader-1304', 'outside-1304']
  ]) {
    const visible = await request(viewer, { id: accessibleId, pageSize: '1' }, { list: true });
    assert.equal(visible.statusCode, 200);
    assert.equal(visible.body.total, 1);
    assert.equal(visible.body.leads.length, 1);
    assert.equal(visible.body.leads[0].id, accessibleId);
    for (const id of [inaccessibleId, 'missing-lead']) {
      const hidden = await request(viewer, { id, pageSize: '1' }, { list: true });
      assert.equal(hidden.statusCode, 200);
      assert.equal(hidden.body.total, 0);
      assert.equal(hidden.body.leads.length, 0);
    }
  }
  const admin = await request({ id: 'admin', role: 'admin' }, { id: 'outside-1304', pageSize: '1' }, { list: true });
  assert.equal(admin.body.total, 1);
  assert.equal(admin.body.leads[0].id, 'outside-1304');
});

test('lead ID detail lookup still intersects status filters and requires authentication', async () => {
  const filtered = await request(users[2], { id: 'member-0', status: 'Warm', pageSize: '1' }, { list: true });
  assert.equal(filtered.body.total, 0);
  assert.equal(filtered.body.leads.length, 0);
  const unauthenticated = await request(null, { id: 'member-0', pageSize: '1' }, { list: true });
  assert.equal(unauthenticated.statusCode, 401);
});

test('status and date badges match full filtered list totals, not page lengths', async () => {
  const viewer = users[0];
  const stats = (await request(viewer)).body.stats;
  const filters = {
    hot: { status: 'Hot' },
    warm: { status: 'Warm' },
    fresh: { status: 'Fresh' },
    followup: { status: 'Follow Up' },
    updatedToday: { dateFilter: 'updated_today' },
    updatedYesterday: { dateFilter: 'updated_yesterday' },
    updatedThisWeek: { dateFilter: 'updated_this_week' },
    updatedThisMonth: { dateFilter: 'updated_this_month' },
    recentlyImported: { dateFilter: 'recently_imported' },
    createdToday: { createdDateFilter: 'created_today' },
    createdYesterday: { createdDateFilter: 'created_yesterday' },
    createdThisWeek: { createdDateFilter: 'created_this_week' },
    thisMonth: { createdDateFilter: 'created_this_month' },
    createdLastMonth: { createdDateFilter: 'created_last_month' },
    overdueFollowUps: { showOverdueFollowUp: 'true' }
  };
  for (const [key, filter] of Object.entries(filters)) {
    for (const pageSize of ['1', '50', '100']) {
      const response = await request(viewer, { ...filter, page: '2', pageSize }, { list: true });
      assert.equal(response.statusCode, 200);
      assert.equal(stats[key], response.body.total, key);
      assert.ok(response.body.leads.length <= Number(pageSize));
      assert.ok(stats[key] > response.body.leads.length);
    }
  }
});

test('IST day and month boundaries include the final millisecond and exclude null timestamps', async () => {
  const stats = (await request(users[2])).body.stats;
  const visible = leads.filter(lead => lead.assignedTo === 'member');
  assert.equal(stats.updatedYesterday, visible.filter(lead => lead.updatedAt === '2026-10-14T18:29:59.999Z').length);
  assert.equal(stats.createdLastMonth, visible.filter(lead => lead.createdAt === '2026-09-30T18:29:59.999Z').length);
  assert.equal(stats.createdToday, visible.filter(lead => ['2026-10-15T00:00:00Z', '2026-10-14T18:30:00Z'].includes(lead.createdAt)).length);
});

test('the calendar day advances at IST midnight rather than server/UTC midnight', async () => {
  class EarlyIndiaDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T20:00:00Z'])); }
  }
  const early = (await request(users[2], {}, { clock: EarlyIndiaDate })).body.stats;
  const later = (await request(users[2])).body.stats;
  for (const key of ['createdToday', 'createdYesterday', 'updatedToday', 'updatedYesterday', 'thisMonth']) {
    assert.equal(early[key], later[key], key);
  }
});

test('empty buckets return real zeros; failed or absent counts return explicit errors', async () => {
  const emptyClient = database();
  const originalFrom = emptyClient.from;
  emptyClient.from = table => {
    const query = originalFrom(table);
    return ['leads', 'crm_overdue_leads'].includes(table) ? query.eq('assignedTo', 'nobody') : query;
  };
  const empty = await request({ role: 'admin' }, {}, { client: emptyClient });
  assert.equal(empty.body.stats.total, 0);
  assert.equal(empty.body.stats.hot, 0);
  for (const options of [{ failCounts: true }, { nullCount: true }]) {
    const failed = await request({ role: 'admin' }, {}, { client: database(options) });
    assert.equal(failed.statusCode, 500);
    assert.equal(failed.body.success, false);
    assert.equal(failed.body.stats, undefined);
  }
  const anonymous = await request(null);
  assert.equal(anonymous.statusCode, 401);
});

test('overdue totals and list use the same database view and exclude closed or updated leads', async () => {
  for (const viewer of [users[2], users[0], { role: 'admin' }]) {
    const accessible = viewer.role === 'admin' ? users.map(user => user.username) :
      viewer.role === 'manager' ? ['manager', 'leader', 'member'] : ['member'];
    const expected = leads.filter(row => accessible.includes(row.assignedTo) &&
      row.followUp && Date.parse(row.followUp) < Date.parse(now) &&
      !['Enrolled', 'Not Interested'].includes(row.status) &&
      (!row.updatedAt || Date.parse(row.updatedAt) <= Date.parse(row.followUp)));
    const client = database();
    const stats = await request(viewer, {}, { client });
    assert.equal(stats.body.stats.overdueFollowUps, expected.length);
    assert.ok(client.calls.some(call => call.table === 'crm_overdue_leads' && call.options.head));
    for (const filter of [{ showOverdueFollowUp: 'true' }, { followUpFilter: 'overdue' }]) {
      const list = await request(viewer, { ...filter, page: '1', pageSize: '1000' }, { list: true });
      assert.equal(list.statusCode, 200);
      assert.equal(list.body.total, expected.length);
      assert.ok(list.body.leads.every(row => expected.some(match => match.id === row.id)));
    }
  }
});

test('missing overdue view fails explicitly instead of returning an empty successful bucket', async () => {
  for (const list of [false, true]) {
    const response = await request({ role: 'admin' }, { followUpFilter: 'overdue' }, {
      list, client: database({ failOverdue: true })
    });
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.success, false);
  }
});

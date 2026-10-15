const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const duplicates = require('../utils/leadDuplicates');
const hierarchy = require('../utils/reportingHierarchy');

const users = [
  { id: 'manager', username: 'manager', role: 'manager' },
  { id: 'leader', username: 'leader', role: 'team_leader', reports_to: 'manager' },
  { id: 'member', username: 'member', role: 'counselor', reports_to: 'leader' },
  { id: 'outside', username: 'outside', role: 'counselor' },
  { id: 'admin', username: 'admin', role: 'admin' },
  { id: 'super', username: 'super', role: 'super_admin' }
];
const lead = (id, changes = {}) => ({
  id, fullName: `Lead ${id}`, email: `${id}@example.invalid`, phone: '+911234567890',
  status: 'Fresh', assignedTo: 'member', company: 'DMHCA',
  notes: '[{"id":"note","content":"Private note","timestamp":"2026-01-01","author":"member"}]',
  ...changes
});

function database(rows = [], options = {}) {
  const writes = [];
  let nextId = 0;
  let beforeInsert = options.beforeInsert;
  return {
    rows, writes,
    rpc(name, contacts) {
      assert.equal(name, 'crm_find_lead_contacts');
      return {
        async range(first, last) {
          if (options.lookupFailure) return { data: null, error: new Error('RPC unavailable') };
          const matches = rows.filter(row =>
            contacts.emails.includes(duplicates.normalizeEmail(row.email)) ||
            contacts.phones.includes(duplicates.normalizePhone(row.phone)));
          return { data: matches.slice(first, last + 1).map(row => ({
            id: row.id, email: row.email, phone: row.phone, assignedTo: row.assignedTo
          })), error: null };
        }
      };
    },
    from(table) {
      const filters = [];
      let first = 0;
      let last = Infinity;
      let pendingInsert;
      const query = {
        select() { return this; },
        order() { return this; },
        range(start, end) { first = start; last = end; return this; },
        eq(key, value) { filters.push(row => row[key] === value); return this; },
        in(key, values) { filters.push(row => values.includes(row[key])); return this; },
        insert(data) { pendingInsert = data; return this; },
        async result(single = false) {
          if (pendingInsert) {
            if (beforeInsert) { const action = beforeInsert; beforeInsert = null; action(rows, pendingInsert); }
            if (options.insertFailure) return { data: null, error: { message: 'Database unavailable', code: 'XX000' } };
            for (const incoming of pendingInsert) {
              for (const key of ['email', 'phone']) {
                const normalize = key === 'email' ? duplicates.normalizeEmail : duplicates.normalizePhone;
                if (normalize(incoming[key]) && rows.some(row => normalize(row[key]) === normalize(incoming[key]))) {
                  return { data: null, error: { code: '23505', message: `violates unique constraint "leads_unique_contact_${key}"` } };
                }
              }
            }
            const inserted = pendingInsert.map(row => ({ id: `created-${nextId++}`, ...row }));
            rows.push(...inserted);
            writes.push(...inserted);
            return { data: single ? inserted[0] : inserted, error: null };
          }
          if (options.readFailure) return { data: null, error: new Error('Read failed') };
          const data = (table === 'users' ? users : rows).filter(row => filters.every(filter => filter(row))).slice(first, last + 1);
          return { data: single ? data[0] || null : data, error: null };
        },
        maybeSingle() { return this.result(true); },
        single() { return this.result(true); },
        then(resolve, reject) { return this.result().then(resolve, reject); }
      };
      return query;
    }
  };
}

async function request(client, {
  route = '/api/leads', body = {}, viewer = users[2], authenticated = true, simple = false
} = {}) {
  const context = {
    module: { exports: {} },
    process: { env: { JWT_SECRET: 'test', SUPABASE_URL: 'test', SUPABASE_SERVICE_KEY: 'test' } },
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'jsonwebtoken') return { verify: () => viewer };
      if (name === '../utils/reportingHierarchy') return hierarchy;
      if (name === '../utils/leadDuplicates') return duplicates;
      if (name === '../utils/callSchedule') return require('../utils/callSchedule');
      if (name === '../utils/logger') return { info() {}, error() {} };
      throw new Error(`Unexpected dependency ${name}`);
    }
  };
  const file = simple ? 'leads-simple.js' : 'leads.js';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'api', file), 'utf8'), context);
  const response = {
    statusCode: 200, setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
  await context.module.exports({
    method: 'POST', path: route, url: route, query: {}, body,
    headers: authenticated ? { authorization: 'Bearer test' } : {}
  }, response);
  return response;
}

test('contact normalization is case-insensitive and handles formatted international phones', () => {
  assert.equal(duplicates.normalizeEmail(' PERSON@Example.com '), 'person@example.com');
  assert.equal(duplicates.normalizePhone('+91 (98765) 43210'), '919876543210');
  assert.equal(duplicates.normalizePhone('0091-98765-43210'), '919876543210');
  assert.notEqual(duplicates.normalizePhone('9876543210'), duplicates.normalizePhone('+91 9876543210'));
  for (const field of ['email', 'phone', 'fullName']) {
    assert.ok(duplicates.validateLeadContact({ ...lead('new'), [field]: '' }));
  }
});

test('single-lead email is required for every role and both lead APIs', async () => {
  for (const viewer of users) {
    for (const simple of [false, true]) {
      const client = database();
      const response = await request(client, { viewer, simple, body: lead('new', { email: '' }) });
      assert.equal(response.statusCode, 400);
      assert.match(response.body.error, /Email is required/);
      assert.equal(client.writes.length, 0);
    }
  }
});

test('every role must supply +country code in both single creation APIs', async () => {
  for (const viewer of users) {
    for (const simple of [false, true]) {
      const client = database();
      const response = await request(client, { viewer, simple, body: lead('new', { phone: '9876543210' }) });
      assert.equal(response.statusCode, 400);
      assert.match(response.body.error, /\+country code/);
      assert.equal(client.writes.length, 0);
    }
  }
});

test('international phone validation enforces prefix and digit boundaries without changing legacy normalization', () => {
  for (const phone of ['+91 9876543210', '+1 (202) 555-0123', ' +44 20 7946 0958 ', '+1234567', '+123456789012345']) {
    assert.equal(duplicates.isInternationalPhone(phone), true, phone);
    assert.equal(duplicates.validateLeadContact(lead('new', { phone })), null, phone);
  }
  for (const phone of ['', '9876543210', '00919876543210', '+0919876543210', '++919876543210',
    '+91', '+123456', '+1234567890123456', '+91 abcdefghij', '91+9876543210']) {
    assert.equal(duplicates.isInternationalPhone(phone), false, phone);
    assert.match(duplicates.validateLeadContact(lead('new', { phone })), /\+country code/, phone);
  }
});

test('bulk preview and final import reject phones without country codes and accept international phones', async () => {
  for (const route of ['/api/leads/import-preview', '/api/leads/bulk-create']) {
    const client = database();
    const response = await request(client, { route, body: {
      assignedTo: 'member', status: 'Fresh', leads: [
        lead('national', { phone: '9876543210', rowNumber: 2 }),
        lead('prefix00', { phone: '00919876543210', rowNumber: 3 }),
        lead('international', { phone: '+91 9876543210', rowNumber: 4 })
      ]
    } });
    assert.equal(response.statusCode, 200);
    if (route.endsWith('import-preview')) {
      assert.equal(response.body.accepted.length, 1);
      assert.equal(response.body.invalid.length, 2);
      assert.ok(response.body.invalid.every(row => row.error.includes('+country code')));
      assert.equal(client.writes.length, 0);
    } else {
      assert.equal(response.body.results.success, 1);
      assert.equal(response.body.results.failed, 2);
      assert.equal(client.writes[0].phone, '+91 9876543210');
    }
  }
});

test('either phone or email rejects a duplicate globally, even when the other contact is new', async () => {
  for (const simple of [false, true]) {
    for (const contact of [
      { email: 'PERSON@example.invalid', phone: '+919999999999' },
      { email: 'new@example.invalid', phone: '+91 (98765) 43210' }
    ]) {
      const client = database([lead('existing', {
        email: ' person@example.invalid ', phone: '0091-98765-43210', assignedTo: 'outside'
      })]);
      const result = await request(client, { simple, body: lead('new', contact) });
      assert.equal(result.statusCode, 409);
      assert.equal(client.writes.length, 0);
      assert.equal(result.body.existingLead, undefined);
    }
  }
});

test('live checks return full accessible details and only ownership for out-of-bucket matches', async () => {
  const rows = [lead('own', { email: 'own@example.invalid' }), lead('private', {
    assignedTo: 'outside', phone: '9999999999', email: 'secret@example.invalid'
  })];
  for (const viewer of users) {
    const result = await request(database(rows), {
      route: '/api/leads/duplicate-check', viewer,
      body: { email: 'secret@example.invalid', phone: '+911234567890' }
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.duplicates.length, 2);
    const own = result.body.duplicates.find(match => match.assignedTo === 'member');
    const outside = result.body.duplicates.find(match => match.assignedTo === 'outside');
    const fullOwn = ['manager', 'team_leader', 'counselor', 'admin', 'super_admin'].includes(viewer.role) && viewer.username !== 'outside';
    assert.equal(own.canView, fullOwn);
    if (own.canView) assert.equal(own.lead.notes[0].content, 'Private note');
    if (!['outside', 'admin', 'super'].includes(viewer.username)) {
      assert.deepEqual(Object.keys(outside).sort(), ['assignedTo', 'canView', 'matchedBy']);
      assert.equal(outside.canView, false);
    }
  }
});

test('lookup is not truncated by database row limits and handles more than 200 contact keys', async () => {
  const rows = Array.from({ length: 1205 }, (_, index) => lead(String(index)));
  assert.equal((await duplicates.findContactMatches(database(rows), [{ phone: '+911234567890' }])).length, 1205);
  const unique = rows.map((row, index) => ({ ...row, phone: `+91${8000000000 + index}` }));
  const review = await duplicates.reviewImport(database(unique), unique);
  assert.equal(review.duplicates.length, 1205);
  assert.equal(review.accepted.length, 0);
});

test('bulk preview counts phone OR email duplicates in CRM and file separately from invalid rows', async () => {
  const client = database([lead('existing', { phone: '+91 9876543210', assignedTo: 'outside' })]);
  const rows = [
    lead('phone-match', { phone: '+91 98765 43210', rowNumber: 2 }),
    lead('email-match', { email: 'EXISTING@example.invalid', phone: '+919999999999', rowNumber: 3 }),
    lead('accepted', { phone: '+917777777777', rowNumber: 4 }),
    lead('repeat-phone', { phone: '+91 777-777-7777', rowNumber: 5 }),
    lead('repeat-email', { email: ' ACCEPTED@EXAMPLE.INVALID ', phone: '+916666666666', rowNumber: 6 }),
    lead('missing-email', { email: '', phone: '+915555555555', rowNumber: 7 }),
    lead('bad-email', { email: 'invalid', phone: '+914444444444', rowNumber: 8 })
  ];
  const response = await request(client, { route: '/api/leads/import-preview', body: { leads: rows } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.total, 7);
  assert.equal(response.body.accepted.length, 1);
  assert.deepEqual(response.body.duplicates.map(row => row.rowNumber), [2, 3, 5, 6]);
  assert.equal(response.body.invalid.length, 2);
  assert.equal(client.writes.length, 0);
});

test('import requires assignee/status, rejects out-of-team assignments and ignores file overrides', async () => {
  const rows = [lead('new', { assignedTo: 'outside', status: 'Enrolled' })];
  for (const selection of [{}, { assignedTo: 'member' }, { assignedTo: 'member', status: 'invalid' }]) {
    const client = database();
    const result = await request(client, { route: '/api/leads/bulk-create', body: { leads: rows, ...selection } });
    assert.equal(result.statusCode, 400);
    assert.equal(client.writes.length, 0);
  }
  const outside = await request(database(), {
    route: '/api/leads/bulk-create', body: { leads: rows, assignedTo: 'outside', status: 'Hot' }
  });
  assert.equal(outside.statusCode, 403);
  const client = database();
  const imported = await request(client, {
    viewer: users[0], route: '/api/leads/bulk-create',
    body: { leads: rows, assignedTo: 'member', status: 'Hot' }
  });
  assert.equal(imported.body.results.success, 1);
  assert.equal(client.writes[0].assignedTo, 'member');
  assert.equal(client.writes[0].status, 'Hot');
});

test('final import rechecks duplicates and cannot bypass preview or create more than one copy', async () => {
  const client = database([lead('existing')]);
  const response = await request(client, {
    route: '/api/leads/bulk-create', body: { assignedTo: 'member', status: 'Warm', leads: [
      lead('email-dup', { email: 'existing@example.invalid', phone: '+919999999999' }),
      lead('phone-dup', { phone: '+911234567890' }),
      lead('new', { phone: '+917777777777' }),
      lead('file-dup', { phone: '+917777777777' }),
      lead('invalid', { phone: '+915555555555', email: '' })
    ] }
  });
  assert.equal(response.body.results.success, 1);
  assert.equal(response.body.results.duplicates, 3);
  assert.equal(response.body.results.failed, 1);
  assert.equal(client.writes.length, 1);
});

test('racing inserts report duplicates, not generic failures or duplicate successful writes', async () => {
  const incoming = lead('new');
  const client = database([], { beforeInsert(rows) { rows.push(lead('racer')); } });
  const single = await request(client, { body: incoming });
  assert.equal(single.statusCode, 409);
  assert.equal(client.writes.length, 0);
  const bulkClient = database([], { beforeInsert(rows) { rows.push(lead('racer')); } });
  const bulk = await request(bulkClient, {
    route: '/api/leads/bulk-create',
    body: { leads: [incoming, lead('unique', { phone: '+918888888888' })], assignedTo: 'member', status: 'Fresh' }
  });
  assert.equal(bulk.body.results.success, 1);
  assert.equal(bulk.body.results.duplicates, 1);
  assert.equal(bulk.body.results.failed, 0);
});

test('failed duplicate checks fail closed for single create, preview and import; endpoints require auth', async () => {
  for (const route of ['/api/leads', '/api/leads/duplicate-check', '/api/leads/import-preview', '/api/leads/bulk-create']) {
    const body = route.endsWith('duplicate-check') ? { email: 'new@example.invalid' } :
      route.endsWith('preview') || route.endsWith('bulk-create') ?
        { leads: [lead('new')], assignedTo: 'member', status: 'Fresh' } : lead('new');
    const client = database([], { lookupFailure: true });
    const failed = await request(client, { route, body });
    assert.equal(failed.statusCode, 500, route);
    assert.equal(client.writes.length, 0);
    const anonymous = await request(database(), { route, body, authenticated: false });
    assert.equal(anonymous.statusCode, 401, route);
  }
});

test('large imports report the entire inserted count instead of the default database return limit', async () => {
  const rows = Array.from({ length: 1205 }, (_, index) => lead(`new-${index}`, { phone: `+91${8000000000 + index}` }));
  const client = database();
  const response = await request(client, {
    route: '/api/leads/bulk-create', body: { leads: rows, assignedTo: 'member', status: 'Fresh' }
  });
  assert.equal(response.body.results.success, 1205);
  assert.equal(client.writes.length, 1205);
});

test('SQL migration preserves legacy duplicates and guards new contacts with serialized database checks', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'lead-duplicates-migration.sql'), 'utf8');
  assert.match(sql, /CREATE INDEX IF NOT EXISTS leads_contact_email_lookup/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS leads_contact_phone_lookup/);
  assert.match(sql, /BEFORE INSERT OR UPDATE OF email, phone/);
  assert.match(sql, /new_email IS DISTINCT FROM public\.crm_normalize_lead_email\(OLD.email\)/);
  assert.match(sql, /new_phone IS DISTINCT FROM public\.crm_normalize_lead_phone\(OLD.phone\)/);
  assert.match(sql, /ON CONFLICT \(contact_type, contact\) DO UPDATE/);
  assert.match(sql, /ERRCODE = '23505'/);
  assert.match(sql, /CONSTRAINT = 'leads_unique_contact_'/);
  assert.match(sql, /REVOKE ALL ON TABLE public.crm_lead_contact_locks FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(sql, /\bDELETE FROM\b/i);
  assert.doesNotMatch(sql, /Existing leads contain duplicate|CREATE UNIQUE INDEX/i);
});

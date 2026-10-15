const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, logger } = require('../test-support/isolated-module');

function fixture(data = [], error = null) {
  const calls = [];
  const query = {};
  for (const method of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'or', 'order']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.single = async () => ({ data, error });
  query.then = (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject);
  const service = loadModule('services/calendarService.js', {
    '../config/supabaseClient': { supabase: query },
    '../utils/logger': logger
  });
  return { service, calls };
}

test('calendar creates events with required fields and defaults', async () => {
  const event = { title: 'Team Meeting', start_time: '2026-01-20T10:00:00Z', end_time: '2026-01-20T11:00:00Z', user_id: 'user-123' };
  const { service, calls } = fixture({ id: 'event-123', ...event });
  const result = await service.createEvent(event);
  assert.equal(result.success, true);
  assert.equal(result.data.id, 'event-123');
  assert.deepEqual(calls[0], ['from', 'calendar_events']);
  const inserted = calls.find(call => call[0] === 'insert')[1];
  for (const [key, value] of Object.entries(event)) assert.equal(inserted[key], value);
  assert.equal(inserted.type, 'meeting');
  assert.equal(inserted.reminder_minutes, 30);
  assert.equal(inserted.status, 'scheduled');
  assert.equal(inserted.attendees.length, 0);
  assert.ok(Number.isFinite(inserted.created_at.getTime()));
});

test('calendar propagates database validation failures rather than returning obsolete error objects', async () => {
  const error = new Error('start_time cannot be null');
  const { service } = fixture(null, error);
  await assert.rejects(service.createEvent({ title: 'Meeting' }), err => err === error);
});

test('calendar filters dates, owner/attendees, type and status and sorts ascending', async () => {
  const events = [{ id: '1' }, { id: '2' }];
  const { service, calls } = fixture(events);
  const result = await service.getEvents({ user_id: 'user-123', start_date: '2026-01-20', end_date: '2026-01-21', type: 'meeting', status: 'scheduled' });
  assert.equal(result.success, true);
  assert.deepEqual(result.data, events);
  for (const expected of [
    ['gte', 'start_time', '2026-01-20'], ['lte', 'start_time', '2026-01-21'],
    ['or', 'user_id.eq.user-123,attendees.cs.{user-123}'],
    ['eq', 'type', 'meeting'], ['eq', 'status', 'scheduled']
  ]) assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(expected)));
  assert.equal(calls.at(-1)[0], 'order');
  assert.equal(calls.at(-1)[1], 'start_time');
  assert.equal(calls.at(-1)[2].ascending, true);
});

test('calendar detects overlapping events and excludes the event being edited', async () => {
  const event = { id: 'existing', start_time: '2026-01-20T10:30:00Z', end_time: '2026-01-20T11:30:00Z' };
  const { service, calls } = fixture([event]);
  const result = await service.checkConflicts('user-123', '2026-01-20T10:00:00Z', '2026-01-20T11:00:00Z', 'editing');
  assert.equal(result.hasConflicts, true);
  assert.deepEqual(result.conflicts, [event]);
  assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['neq', 'id', 'editing'])));
});

test('calendar overlap query requires both bounds so earlier and later events do not conflict', async () => {
  for (const [start, end, expected] of [[8, 9, false], [12, 13, false], [9, 10, true], [10.5, 11.5, true], [9, 12, true]]) {
    const predicates = [];
    const query = {
      from() { return this; }, select() { return this; }, eq() { return this; },
      lte(column, bound) { predicates.push(row => row[column] <= bound); return this; },
      gte(column, bound) { predicates.push(row => row[column] >= bound); return this; },
      then(resolve, reject) {
        const row = { start_time: start, end_time: end };
        return Promise.resolve({ data: predicates.every(predicate => predicate(row)) ? [row] : [], error: null }).then(resolve, reject);
      }
    };
    const service = loadModule('services/calendarService.js', {
      '../config/supabaseClient': { supabase: query }, '../utils/logger': logger
    });
    assert.equal((await service.checkConflicts('user-123', 10, 11)).hasConflicts, expected);
    assert.equal(predicates.length, 2);
  }
});

test('calendar updates fields with a timestamp, updates status and fetches by ID', async () => {
  const { service, calls } = fixture({ id: 'event-123' });
  assert.equal((await service.updateEvent('event-123', { title: 'Updated Meeting' })).success, true);
  const updated = calls.find(call => call[0] === 'update')[1];
  assert.equal(updated.title, 'Updated Meeting');
  assert.ok(Number.isFinite(updated.updated_at.getTime()));
  assert.equal((await service.updateEventStatus('event-123', 'completed')).success, true);
  assert.equal(calls.filter(call => call[0] === 'update')[1][1].status, 'completed');
  assert.equal((await service.getEventById('event-123')).data.id, 'event-123');
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === 'event-123'));
});

test('calendar deletes an event by ID', async () => {
  const { service, calls } = fixture(null);
  assert.equal((await service.deleteEvent('event-123')).success, true);
  assert.ok(calls.some(call => call[0] === 'delete'));
  assert.deepEqual(calls.at(-1), ['eq', 'id', 'event-123']);
});

test('calendar upcoming events cover seven days and today covers the local day', async () => {
  const { service } = fixture();
  const queries = [];
  service.getEvents = async options => { queries.push(options); return { success: true, data: [{ id: '1' }] }; };
  assert.equal((await service.getUpcomingEvents('user-123')).data.length, 1);
  assert.equal(queries[0].status, 'scheduled');
  assert.equal(queries[0].user_id, 'user-123');
  assert.equal(Date.parse(queries[0].end_date) - Date.parse(queries[0].start_date), 7 * 86400000);
  assert.equal((await service.getTodayEvents('user-123')).data.length, 1);
  const start = new Date(queries[1].start_date);
  const end = new Date(queries[1].end_date);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getMilliseconds(), 999);
});

test('calendar read, update, conflict and delete operations propagate database errors', async () => {
  const error = new Error('database unavailable');
  const { service } = fixture(null, error);
  for (const operation of [
    () => service.getEvents({}), () => service.getEventById('id'),
    () => service.updateEvent('id', {}), () => service.updateEventStatus('id', 'completed'),
    () => service.checkConflicts('id', 'start', 'end'), () => service.deleteEvent('id')
  ]) await assert.rejects(operation(), err => err === error);
});

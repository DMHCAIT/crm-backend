const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const { loadModule, loadServer, logger } = require('../test-support/isolated-module');

const env = {
  JWT_SECRET: 'isolated-route-test-secret',
  SUPABASE_URL: 'https://isolated.invalid',
  SUPABASE_SERVICE_KEY: 'test-only'
};

function offlineHandlers() {
  const calls = [];
  const database = {
    from(table) {
      calls.push(table);
      const query = {};
      for (const method of ['select', 'eq', 'order', 'range', 'gte', 'group', 'limit']) {
        query[method] = () => query;
      }
      query.then = (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
      return query;
    }
  };
  const common = {
    '@supabase/supabase-js': { createClient: () => database },
    jsonwebtoken: jwt,
    '../utils/logger': logger
  };
  return {
    calls,
    './api/analytics-events.js': loadModule('api/analytics-events.js', common, env),
    './api/analytics-tracking.js': loadModule('api/analytics-tracking.js', common, env),
    './api/enhanced-analytics.js': loadModule('api/enhanced-analytics.js', common, env),
    './api/scheduled-exports.js': loadModule('api/scheduled-exports.js', {
      ...common,
      express,
      '../services/emailService': { send() { throw new Error('Unexpected email delivery'); } },
      'node-cron': { schedule() { throw new Error('Unexpected scheduled job'); } }
    }, env)
  };
}

test('deployed analytics aliases and scheduled-export router reach actual handlers offline', async t => {
  const handlers = offlineHandlers();
  const app = express();
  app.listen = () => ({ close() {} });
  const isolatedExpress = Object.assign(() => app, {
    json: express.json,
    urlencoded: express.urlencoded
  });
  loadServer(env, {
    express: isolatedExpress,
    cors: require('cors'),
    './api/analytics-events.js': handlers['./api/analytics-events.js'],
    './api/analytics-tracking.js': handlers['./api/analytics-tracking.js'],
    './api/enhanced-analytics.js': handlers['./api/enhanced-analytics.js'],
    './api/scheduled-exports.js': handlers['./api/scheduled-exports.js']
  });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options = {}) => fetch(url, { signal: AbortSignal.timeout(5000), ...options });
  const token = jwt.sign({ id: 'route-user', role: 'admin' }, env.JWT_SECRET);
  const authorization = `Bearer ${token}`;

  for (const route of ['/api/analytics/events', '/api/enhanced-analytics/events']) {
    const denied = await request(`${base}${route}?limit=5`);
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).error, 'Unauthorized');
    const allowed = await request(`${base}${route}?limit=5`, { headers: { authorization } });
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.events, []);
    assert.equal(body.pagination.limit, 5);
  }
  for (const route of [
    '/api/analytics/dashboard/stats', '/api/enhanced-analytics/dashboard/stats',
    '/api/analytics/dashboard/campaigns', '/api/enhanced-analytics/dashboard/campaigns',
    '/api/analytics/realtime', '/api/enhanced-analytics/realtime'
  ]) {
    const denied = await request(`${base}${route}`);
    assert.equal(denied.status, 401, route);
  }

  const eventDenied = await request(`${base}/api/analytics-events`);
  assert.equal(eventDenied.status, 401);
  for (const [route, error] of [
    ['/api/analytics-events', 'Event type is required'],
    ['/api/analytics-events/batch', 'Events array is required']
  ]) {
    const invalid = await request(`${base}${route}`, {
      method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: '{}'
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error, error);
  }
  const schedules = await request(`${base}/api/scheduled-exports`, { headers: { authorization } });
  assert.equal(schedules.status, 200);
  assert.deepEqual(await schedules.json(), { schedules: [] });
  const tracking = await request(`${base}/api/analytics-tracking?event_type=page_view&limit=5`, { headers: { authorization } });
  assert.equal(tracking.status, 200);
  assert.deepEqual(await tracking.json(), { success: true, data: [], count: 0 });
  const missingEvent = await request(`${base}/api/analytics-tracking`, {
    method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(missingEvent.status, 400);
  assert.equal((await missingEvent.json()).error, 'event_type is required');
  for (const [method, route] of [
    ['GET', '/api/scheduled-exports'], ['POST', '/api/scheduled-exports'],
    ['PUT', '/api/scheduled-exports/test-id'], ['DELETE', '/api/scheduled-exports/test-id'],
    ['POST', '/api/scheduled-exports/test-id/run']
  ]) {
    const denied = await request(`${base}${route}`, { method });
    assert.equal(denied.status, 401, `${method} ${route}`);
    assert.equal((await denied.json()).error, 'No authorization header');
  }
  assert.ok(handlers.calls.includes('analytics_events'));
  assert.ok(handlers.calls.includes('scheduled_exports'));
});

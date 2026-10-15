const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadServer } = require('../test-support/isolated-module');

for (const route of ['/health', '/api/health']) {
  test(`${route} returns the current public JSON health contract without connecting to services`, async () => {
    const server = loadServer({ NODE_ENV: 'test', JWT_SECRET: 'isolated-test-secret' });
    const res = await server.request('GET', route);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /json/);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.uptime, 123);
    assert.ok(Number.isFinite(Date.parse(res.body.timestamp)));
    assert.deepEqual(res.body.services, { database: 'not configured', authentication: 'configured' });
  });
}

test('health database label reflects configuration, not a database connectivity probe', async () => {
  const server = loadServer({ SUPABASE_URL: 'https://isolated.invalid' });
  const res = await server.request('GET', '/health');
  assert.equal(res.body.services.database, 'connected');
});

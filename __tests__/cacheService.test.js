const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, logger } = require('../test-support/isolated-module');

async function fixture({ failConnect = false } = {}) {
  const values = new Map();
  const events = {};
  const calls = [];
  let now = 0;
  const client = {
    on(event, handler) { events[event] = handler; },
    async connect() {
      if (failConnect) throw new Error('offline');
      events.connect();
      events.ready();
    },
    async get(key) {
      const value = values.get(key);
      return value && value.expires > now ? value.text : null;
    },
    async setEx(key, ttl, text) {
      calls.push([key, ttl, text]);
      values.set(key, { text, expires: now + ttl * 1000 });
    },
    async del(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) values.delete(key);
    },
    async keys(pattern) {
      return [...values.keys()].filter(key => key.startsWith(pattern.replace(/\*$/, '')));
    },
    async flushAll() { values.clear(); },
    async quit() { events.end(); }
  };
  let options;
  const service = loadModule('services/cacheService.js', {
    redis: { createClient(config) { options = config; return client; } },
    '../utils/logger': logger
  }, { REDIS_URL: 'redis://isolated.invalid:6379' });
  // The singleton starts connecting at module load; settle that mocked operation.
  await Promise.resolve();
  await Promise.resolve();
  return { service, client, events, calls, options, advance(ms) { now += ms; } };
}

test('cache round trips JSON, uses default TTL, misses and deletes keys', async () => {
  const { service, calls } = await fixture();
  const value = { name: 'Test', count: 42 };
  assert.equal(await service.set('test:key', value), true);
  assert.deepEqual(await service.get('test:key'), value);
  assert.equal(calls[0][1], 3600);
  assert.equal(await service.get('missing'), null);
  assert.equal(await service.delete('test:key'), true);
  assert.equal(await service.get('test:key'), null);
});

test('cache forwards TTL and observes expiration without a wall-clock delay', async () => {
  const { service, calls, advance } = await fixture();
  await service.set('ttl', 'expires soon', 1);
  assert.deepEqual(calls[0], ['ttl', 1, '"expires soon"']);
  assert.equal(await service.get('ttl'), 'expires soon');
  advance(1100);
  assert.equal(await service.get('ttl'), null);
});

test('cache deletes matching keys only and flushes all keys', async () => {
  const { service } = await fixture();
  await service.set('user:1', 1);
  await service.set('user:2', 2);
  await service.set('product:1', 3);
  assert.equal(await service.deletePattern('user:*'), 2);
  assert.equal(await service.get('user:1'), null);
  assert.equal(await service.get('user:2'), null);
  assert.equal(await service.get('product:1'), 3);
  assert.equal(await service.deletePattern('absent:*'), 0);
  assert.equal(await service.flush(), true);
  assert.equal(await service.get('product:1'), null);
});

test('cache-aside fetches once, caches falsy values, ignores null and propagates fetch errors', async () => {
  const { service } = await fixture();
  let count = 0;
  const fetch = async () => { count++; return { data: 'fetched' }; };
  assert.deepEqual(await service.getOrSet('key', fetch), { data: 'fetched' });
  assert.deepEqual(await service.getOrSet('key', fetch), { data: 'fetched' });
  assert.equal(count, 1);
  for (const value of [false, 0, '']) {
    await service.set('falsy', value);
    assert.equal(await service.getOrSet('falsy', fetch), value);
  }
  for (const value of [null, undefined]) {
    assert.equal(await service.getOrSet('empty', async () => value), value);
    assert.equal(await service.get('empty'), null);
  }
  await assert.rejects(service.getOrSet('error', async () => { throw new Error('fetch failed'); }), /fetch failed/);
});

test('cache generates namespaced keys', async () => {
  const { service } = await fixture();
  assert.equal(service.generateKey('users', '123', 'profile'), 'users:123:profile');
  assert.equal(service.generateKey('global'), 'global:');
});

test('cache connection lifecycle and bounded retries use the configured Redis URL', async () => {
  const { service, client, events, options } = await fixture();
  assert.equal(options.url, 'redis://isolated.invalid:6379');
  assert.equal(await service.connect(), client);
  assert.equal(options.socket.reconnectStrategy(2), 200);
  assert.match(options.socket.reconnectStrategy(11).message, /connection failed/);
  events.error(new Error('connection lost'));
  assert.equal(service.isConnected, false);
  events.ready();
  await service.disconnect();
  assert.equal(service.isConnected, false);
});

test('cache degrades safely when Redis is unavailable', async () => {
  const { service } = await fixture({ failConnect: true });
  assert.equal(await service.connect(), null);
  assert.equal(await service.get('key'), null);
  assert.equal(await service.set('key', 1), false);
  assert.equal(await service.delete('key'), false);
  assert.equal(await service.deletePattern('*'), 0);
  assert.equal(await service.flush(), false);
  assert.equal(await service.getOrSet('key', async () => 'uncached'), 'uncached');
});

test('cache client errors and invalid cached JSON return safe fallbacks', async () => {
  const { service, client } = await fixture();
  await client.setEx('invalid', 60, 'not JSON');
  assert.equal(await service.get('invalid'), null);
  for (const method of ['get', 'setEx', 'del', 'keys', 'flushAll']) {
    client[method] = async () => { throw new Error('Redis operation failed'); };
  }
  assert.equal(await service.get('key'), null);
  assert.equal(await service.set('key', 1), false);
  assert.equal(await service.delete('key'), false);
  assert.equal(await service.deletePattern('*'), 0);
  assert.equal(await service.flush(), false);
});

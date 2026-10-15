const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { loadModule, response } = require('../../test-support/isolated-module');

const secret = 'isolated-auth-test-secret';
const activeUser = {
  id: 'user-123', email: 'user@example.com', username: 'test-user',
  fullName: 'Test User', name: 'Test User', role: 'counselor', status: 'active',
  password_hash: 'mock-hash'
};

function fixture({ user = activeUser, validPassword = true, signInError = null } = {}) {
  const calls = [];
  let table;
  const database = {
    from(name) { table = name; calls.push(['from', name]); return this; },
    select() { return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    insert(data) { calls.push(['insert', table, data]); return this; },
    update() { return this; },
    async maybeSingle() { return { data: user, error: null }; },
    async single() { return { data: table === 'user_sessions' ? { id: 'session-123' } : user, error: null }; },
    then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
    auth: {
      async signInWithPassword(credentials) {
        calls.push(['signInWithPassword', credentials]);
        return { data: { user: activeUser }, error: signInError };
      },
      admin: { async getUserById() { return { data: { user }, error: null }; } }
    }
  };
  const handler = loadModule('api/auth.js', {
    '@supabase/supabase-js': { createClient: () => database },
    jsonwebtoken: jwt,
    bcrypt: { async compare(password, hash) { calls.push(['compare', password, hash]); return validPassword; } }
  }, { SUPABASE_URL: 'https://isolated.invalid', SUPABASE_SERVICE_KEY: 'test-only', JWT_SECRET: secret });
  return {
    calls,
    async request(method, endpoint, body = {}, headers = {}) {
      const res = response();
      await handler({ method, url: `/api/auth/${endpoint}`, body, headers, query: {}, connection: { remoteAddress: '127.0.0.1' } }, res);
      return res;
    }
  };
}

test('auth CORS preflight and unsupported endpoints/methods have concrete contracts', async () => {
  const { request } = fixture();
  const res = await request('OPTIONS', 'login', {}, { origin: 'http://localhost:5173' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.ended, true);
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.equal((await request('POST', 'unknown')).statusCode, 404);
  assert.equal((await request('GET', 'unknown')).body.error, 'Auth endpoint not found');
  assert.equal((await request('PATCH', 'login')).statusCode, 405);
  assert.equal((await request('OPTIONS', 'login', {}, { origin: 'https://untrusted.invalid' })).headers['access-control-allow-origin'], undefined);
});

test('auth login rejects missing identifier or password before accessing the database', async () => {
  const { request, calls } = fixture();
  for (const body of [{}, { email: activeUser.email }, { password: 'test-only' }]) {
    const res = await request('POST', 'login', body);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /required/);
  }
  assert.equal(calls.length, 0);
});

test('auth local email and username login verify password and return a signed JWT and session', async () => {
  for (const credentials of [{ email: activeUser.email }, { username: activeUser.username }]) {
    const { request, calls } = fixture();
    const res = await request('POST', 'login', { ...credentials, password: 'test-only' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.session_id, 'session-123');
    assert.deepEqual(res.body.user, { id: activeUser.id, email: activeUser.email, name: activeUser.fullName, username: activeUser.username, role: activeUser.role });
    const decoded = jwt.verify(res.body.token, secret);
    assert.equal(decoded.id, activeUser.id);
    assert.equal(decoded.role, activeUser.role);
    assert.ok(!Object.hasOwn(decoded, 'password_hash'));
    assert.ok(calls.some(call => call[0] === 'compare' && call[2] === 'mock-hash'));
    assert.ok(calls.some(call => call[0] === 'insert' && call[1] === 'user_sessions'));
  }
});

test('auth inactive users are rejected before password or Supabase authentication', async () => {
  const { request, calls } = fixture({ user: { ...activeUser, status: 'inactive' } });
  const res = await request('POST', 'login', { email: activeUser.email, password: 'test-only' });
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /deactivated/);
  assert.ok(!calls.some(call => call[0] === 'compare' || call[0] === 'signInWithPassword'));
});

test('auth failed passwords use Supabase fallback and invalid credentials return 401', async () => {
  const { request, calls } = fixture({ validPassword: false, signInError: new Error('invalid credentials') });
  const res = await request('POST', 'login', { username: activeUser.username, password: 'wrong' });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Invalid/);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.find(call => call[0] === 'signInWithPassword')[1])), { email: activeUser.email, password: 'wrong' });
});

test('auth Supabase login fallback returns the user profile and a verifiable JWT', async () => {
  const { request } = fixture({ validPassword: false });
  const res = await request('POST', 'login', { email: activeUser.email, password: 'test-only' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(jwt.verify(res.body.token, secret).id, activeUser.id);
});

test('auth verify and refresh reject absent, malformed, expired and wrong-signature tokens', async () => {
  const { request } = fixture();
  const headers = [
    {}, { authorization: 'Basic test' }, { authorization: 'Bearer not-a-jwt' },
    { authorization: `Bearer ${jwt.sign({ id: activeUser.id }, secret, { expiresIn: -1 })}` },
    { authorization: `Bearer ${jwt.sign({ id: activeUser.id }, 'wrong-secret')}` }
  ];
  for (const [method, endpoint] of [['GET', 'verify'], ['POST', 'refresh']]) {
    for (const header of headers) {
      const res = await request(method, endpoint, {}, header);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    }
  }
});

test('auth valid verify and refresh return the current user and a signed replacement token', async () => {
  const { request } = fixture();
  const token = jwt.sign({ id: activeUser.id, email: activeUser.email, role: activeUser.role }, secret);
  const headers = { authorization: `Bearer ${token}` };
  const verified = await request('GET', 'verify', {}, headers);
  assert.equal(verified.body.success, true);
  assert.deepEqual(verified.body.user, { id: activeUser.id, email: activeUser.email, name: activeUser.name, role: activeUser.role });
  const refreshed = await request('POST', 'refresh', {}, headers);
  assert.equal(refreshed.body.success, true);
  assert.equal(jwt.verify(refreshed.body.token, secret).id, activeUser.id);
});

test('auth logout succeeds with or without a token', async () => {
  const { request } = fixture();
  for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
    const res = await request('POST', 'logout', {}, headers);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: 'Logged out successfully' });
  }
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const logger = Object.fromEntries(
  ['log', 'info', 'warn', 'error', 'debug'].map(level => [level, () => {}])
);

function loadModule(relativePath, dependencies, env = {}, globals = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const context = {
    module: { exports: {} },
    console: logger,
    JSON,
    process: { env: { ...env } },
    require(name) {
      if (!Object.hasOwn(dependencies, name)) {
        throw new Error(`Unexpected dependency in ${relativePath}: ${name}`);
      }
      return dependencies[name];
    },
    ...globals
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return context.module.exports;
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    json(body) {
      this.headers['content-type'] = 'application/json';
      this.body = JSON.parse(JSON.stringify(body));
      return this;
    },
    end() { this.ended = true; return this; }
  };
}

function loadServer(env = {}, overrides = {}) {
  const routes = new Map();
  const handlers = [];
  const app = {
    use(route, handler) {
      if (typeof route === 'string' && typeof handler === 'function') routes.set(`ALL ${route}`, handler);
    },
    get(route, handler) { routes.set(`GET ${route}`, handler); },
    post(route, handler) { routes.set(`POST ${route}`, handler); },
    all(route, handler) { routes.set(`ALL ${route}`, handler); },
    listen() { return { close() {} }; }
  };
  const express = Object.assign(() => app, {
    json: () => () => {},
    urlencoded: () => () => {}
  });
  const dependencies = {
    express,
    cors: () => () => {},
    jsonwebtoken: require('jsonwebtoken'),
    dotenv: { config() {} }
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  for (const match of source.matchAll(/loadHandler\('([^']+)', '([^']+)'\)/g)) {
    handlers.push(match[1]);
    dependencies[match[2]] = (_req, res) => res.json({ success: true });
  }
  Object.assign(dependencies, overrides);
  const loadedApp = loadModule('server.js', dependencies, env, {
    process: { env: { ...env }, uptime: () => 123, on() {}, exit() {} }
  });
  return {
    app: loadedApp,
    handlers,
    async request(method, url, body = {}) {
      const handler = routes.get(`${method} ${url}`) || routes.get(`ALL ${url}`);
      if (!handler) throw new Error(`Unregistered route: ${method} ${url}`);
      const res = response();
      await handler({ method, url, body, headers: {} }, res);
      return res;
    }
  };
}

module.exports = { loadModule, loadServer, logger, response };

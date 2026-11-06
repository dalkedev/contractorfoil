const { it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const mongoose = require('mongoose');
const { readConfig } = require('../config');
const { createApp } = require('../app');
const { startServer } = require('../server');

const secret = 'fictional-lifecycle-signing-key-for-tests';
const databaseName = `cf_test_lifecycle_${process.pid}_${Date.now()}`;
const mongoUri = `mongodb://127.0.0.1:27281/${databaseName}`;
const backend = path.resolve(__dirname, '..');

async function freePort() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  return port;
}

function startChild(port, uri = mongoUri) {
  // Disable filesystem dotenv loading even against the original startup entrypoint.
  const child = spawn(process.execPath, ['-e', 'require("dotenv").config=()=>{}; const entry=require("./index.js"); if(entry.main) entry.main()'], {
    cwd: backend,
    env: { PATH: process.env.PATH, NODE_ENV: 'test', JWT_SECRET: secret, MONGO_URI: uri, PORT: String(port), CORS_ORIGINS: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', value => { output += value; });
  child.stderr.on('data', value => { output += value; });
  return { child, output: () => output };
}

async function waitForReady(port, child) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('API exited before becoming ready');
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`, { signal: AbortSignal.timeout(200) });
      if (response.status === 200) return response.json();
    } catch { /* Startup has not bound its socket yet. */ }
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error('API did not become ready');
}

after(async () => {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1000 });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

it('rejects missing or unsafe configuration without disclosing supplied values', () => {
  for (const env of [
    {}, { JWT_SECRET: secret, PORT: '0' }, { JWT_SECRET: secret, PORT: '5000junk' },
    { JWT_SECRET: secret, MONGO_URI: 'https://private-host/secret' },
    { JWT_SECRET: secret, MONGO_URI: 'mongodb://localhost:27017' },
    { JWT_SECRET: secret, CORS_ORIGINS: '*' },
    { JWT_SECRET: secret, CORS_ORIGINS: 'https://app.example.test/path' },
    { JWT_SECRET: secret, USE_RECAPTCHA: 'yes' },
    { JWT_SECRET: secret, USE_RECAPTCHA: 'true' },
    { JWT_SECRET: secret, NODE_ENV: 'production' },
    { JWT_SECRET: secret, NODE_ENV: 'production', MONGO_URI: mongoUri },
  ]) {
    assert.throws(() => readConfig(env), error => !error.message.includes(secret) && !error.message.includes('private-host'));
  }
});

it('uses local development defaults and requires explicit production origins and CAPTCHA hostname', () => {
  const dev = readConfig({ JWT_SECRET: secret });
  assert.equal(dev.mongoUri, 'mongodb://127.0.0.1:27017/contractorfoil');
  assert.equal(dev.host, '127.0.0.1');
  assert.equal(dev.port, 5000);
  assert.equal(dev.useRecaptcha, false);
  assert.deepEqual(dev.corsOrigins, ['http://localhost:5173', 'http://127.0.0.1:5173']);
  const prod = readConfig({ JWT_SECRET: secret, NODE_ENV: 'production', MONGO_URI: mongoUri, CORS_ORIGINS: '', USE_RECAPTCHA: 'true', RECAPTCHA_SECRET_KEY: 'fictional', RECAPTCHA_HOSTNAME: 'app.example.test' });
  assert.deepEqual(prod.corsOrigins, []);
  assert.equal(prod.host, '0.0.0.0');
});

it('separates HTTP liveness from unavailable database readiness', async () => {
  const listener = createApp({ config: readConfig({ JWT_SECRET: secret, CORS_ORIGINS: '' }) }).listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const live = await fetch(`${base}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    const ready = await fetch(`${base}/health/ready`);
    assert.equal(ready.status, 503);
    assert.deepEqual(await ready.json(), { status: 'unavailable' });
    const missing = await fetch(`${base}/unknown`);
    assert.equal(missing.status, 404);
    assert.equal(typeof (await missing.json()).message, 'string');
  } finally { await new Promise(resolve => listener.close(resolve)); }
});

it('does not bind HTTP while MongoDB startup is failing', { timeout: 10000 }, async () => {
  const port = await freePort();
  const unavailablePort = await freePort();
  const { child, output } = startChild(port, `mongodb://127.0.0.1:${unavailablePort}/cf_test_unavailable`);
  const deadline = Date.now() + 7000;
  let listened = false;
  try {
    while (child.exitCode === null && Date.now() < deadline) {
      try {
        await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(150) });
        listened = true;
        break;
      } catch { /* No listener is the required behavior. */ }
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    assert.equal(listened, false, 'HTTP listened before database readiness');
    assert.equal(child.exitCode, 1, 'Startup must fail within its bounded database timeout');
    assert.equal(output().includes('mongodb://'), false);
    assert.equal(output().includes(secret), false);
  } finally {
    if (child.exitCode === null) { child.kill('SIGKILL'); await once(child, 'exit'); }
  }
});

it('serves after a real database connection and shuts down on SIGTERM', { timeout: 10000 }, async () => {
  const port = await freePort();
  const { child, output } = startChild(port);
  try {
    assert.deepEqual(await waitForReady(port, child), { status: 'ready' });
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Lifecycle User', email: 'lifecycle@example.test', password: 'Correct-example-123' }) });
    assert.equal(response.status, 201);
    assert.equal(typeof (await response.json()).token, 'string');
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const [code, signal] = await exited;
    assert.equal(code, 0);
    assert.equal(signal, null);
    assert.equal(output().includes('mongodb://'), false);
  } finally {
    if (child.exitCode === null) { child.kill('SIGKILL'); await once(child, 'exit'); }
  }
});

it('bounds shutdown while an incomplete HTTP request is still active', { timeout: 5000 }, async () => {
  const runtime = await startServer({ ...readConfig({ JWT_SECRET: secret, MONGO_URI: mongoUri, CORS_ORIGINS: '' }), port: 0, shutdownTimeoutMs: 120 });
  const socket = net.connect(runtime.server.address().port, '127.0.0.1');
  socket.on('error', () => {});
  try {
    await once(socket, 'connect');
    const started = once(runtime.server, 'request');
    socket.write('POST /api/auth/login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 10000\r\n\r\n{');
    await started;
    const stopping = runtime.stop();
    assert.equal(runtime.app.locals.shuttingDown, true);
    assert.equal(runtime.stop(), stopping);
    await assert.rejects(stopping, /Shutdown timed out/);
  } finally {
    socket.destroy();
    runtime.server.closeAllConnections();
    await mongoose.disconnect();
  }
});

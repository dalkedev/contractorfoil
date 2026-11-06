const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Contractor = require('../models/contractorModel');

const secret = 'fictional-test-signing-key-at-least-32-characters';
process.env.JWT_SECRET = secret;
process.env.USE_RECAPTCHA = 'false';
const uri = process.env.CF_TEST_MONGO_URI || `mongodb://127.0.0.1:27281/cf_test_api_${process.pid}_${Date.now()}`;
const parsed = new URL(uri);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
    parsed.protocol !== 'mongodb:' || !/^\/cf_test_[a-zA-Z0-9_]+$/.test(parsed.pathname) ||
    parsed.username || parsed.password || parsed.search) {
  throw new Error('Tests require a loopback-only MongoDB URI with an explicit cf_test_ database');
}

// App construction never starts the process or loads .env files.
const { createApp } = require('../app');
const makeApp = (options = {}) => createApp({ config: { jwtSecret: secret, corsOrigins: [], useRecaptcha: false }, ...options });
const app = makeApp();

let server, base, owner, other, ownerToken, otherToken, record;
const company = { name: 'Fictional Foil Works', phone: '+48 012 345 678', nip: '0123456789', address: '10 Sample Street' };

async function request(path, { method = 'GET', token, body, rawBody, headers = {}, baseUrl = base } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: rawBody === undefined ? (body === undefined ? undefined : JSON.stringify(body)) : rawBody,
    signal: AbortSignal.timeout(4000),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

before(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  await User.init();
  owner = await User.create({ name: 'Fictional Owner', email: 'owner@example.test', password: 'Correct-example-123' });
  other = await User.create({ name: 'Fictional Other', email: 'other@example.test', password: 'Correct-example-456' });
  ownerToken = jwt.sign({ id: owner._id }, secret, { expiresIn: '30d' });
  otherToken = jwt.sign({ id: other._id }, secret, { expiresIn: '30d' });
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await Contractor.deleteMany({});
  record = await Contractor.create({ ...company, user: owner._id });
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('owner boundary and existing response contracts', () => {
  for (const [method, suffix] of [['GET', ''], ['POST', ''], ['GET', '/id'], ['PUT', '/id'], ['DELETE', '/id']]) {
    it(`requires authentication for ${method} /contractors${suffix}`, async () => {
      const result = await request(`/api/contractors${suffix.replace('id', record._id)}`, { method, body: ['POST', 'PUT'].includes(method) ? company : undefined });
      assert.equal(result.status, 401);
      assert.equal(typeof result.body.message, 'string');
    });
  }
  it('hides foreign records on detail, update and delete without changing data', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const result = await request(`/api/contractors/${record._id}`, { method, token: otherToken, body: method === 'PUT' ? { notes: 'Wrong owner' } : undefined });
      assert.equal(result.status, 404, method);
      const missing = await request(`/api/contractors/${new mongoose.Types.ObjectId()}`, { method, token: otherToken, body: method === 'PUT' ? { notes: 'Wrong owner' } : undefined });
      assert.equal(missing.status, 404, method);
      assert.deepEqual(result.body, missing.body, `${method} must not reveal another owner's record`);
    }
    assert.equal((await Contractor.findById(record._id)).notes, undefined);
  });
  it('lists only owned records and retains array/document/delete JSON shapes', async () => {
    const list = await request('/api/contractors', { token: otherToken });
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, []);
    const created = await request('/api/contractors', { method: 'POST', token: otherToken, body: company });
    assert.equal(created.status, 201);
    assert.equal(created.body.user, String(other._id));
    assert.equal(created.body.nip, '0123456789');
    assert.equal((await request(`/api/contractors/${created.body._id}`, { token: otherToken })).body.name, company.name);
    const removed = await request(`/api/contractors/${created.body._id}`, { method: 'DELETE', token: otherToken });
    assert.equal(removed.status, 200);
    assert.equal(typeof removed.body.message, 'string');
    assert.equal(await Contractor.findById(created.body._id), null);
  });
  it('rejects owner reassignment atomically', async () => {
    const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { notes: 'Must not apply', user: String(other._id) } });
    assert.equal(result.status, 400);
    const stored = await Contractor.findById(record._id);
    assert.equal(String(stored.user), String(owner._id));
    assert.equal(stored.notes, undefined);
  });
  for (const key of ['createdAt', 'updatedAt', '__v', '$set', 'name.value', 'unexpected']) {
    it(`rejects protected or unknown key ${key}`, async () => {
      const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { [key]: key === '$set' ? { notes: 'Wrong' } : '2020-01-01' } });
      assert.equal(result.status, 400);
    });
  }
  it('accepts a matching legacy echoed _id and rejects a conflicting one', async () => {
    const changed = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { _id: String(record._id), notes: 'Valid edit' } });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.notes, 'Valid edit');
    const conflict = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { _id: String(other._id), notes: 'Wrong' } });
    assert.equal(conflict.status, 400);
    assert.equal((await Contractor.findById(record._id)).notes, 'Valid edit');
  });
});

describe('sessions and password persistence', () => {
  for (const scheme of ['BearerBad', 'bearer-with-suffix']) {
    it(`rejects malformed ${scheme} authorization`, async () => {
      assert.equal((await request('/api/auth/me', { headers: { Authorization: `${scheme} ${ownerToken}` } })).status, 401);
    });
  }
  it('rejects garbage, missing, extra and expired bearer tokens', async () => {
    for (const value of ['Bearer garbage', 'Bearer', `Bearer ${ownerToken} extra`, `Bearer ${jwt.sign({ id: owner._id }, secret, { expiresIn: -1 })}`]) {
      assert.equal((await request('/api/auth/me', { headers: { Authorization: value } })).status, 401, value.slice(0, 16));
    }
  });
  it('rejects a valid JWT for a deleted account', async () => {
    const deleted = new mongoose.Types.ObjectId();
    const result = await request('/api/contractors', { token: jwt.sign({ id: deleted }, secret) });
    assert.equal(result.status, 401);
  });
  it('keeps legacy signed id tokens valid and returns only public profile fields', async () => {
    const result = await request('/api/auth/me', { token: ownerToken });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { _id: String(owner._id), name: owner.name, email: owner.email });
  });
  it('does not rehash a stored password when saving an unrelated field', async () => {
    const user = await User.create({ name: 'Before', email: 'save-hook@example.test', password: 'Correct-example-789' });
    const hash = user.password;
    user.name = 'After';
    await user.save();
    // The legacy callback hook continues hashing after save resolves; allow that work to finish.
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(user.password, hash);
    await user.save();
    const stored = await User.findById(user._id);
    assert.equal(stored.password, hash);
    assert.equal(await stored.matchPassword('Correct-example-789'), true);
    assert.equal(await stored.matchPassword('Wrong-example-789'), false);
  });
  it('registers and logs in with the established session shape', async () => {
    const result = await request('/api/auth/register', { method: 'POST', body: { name: 'New Fictional User', email: 'new@example.test', password: 'Correct-example-123' } });
    assert.equal(result.status, 201);
    assert.deepEqual(Object.keys(result.body).sort(), ['_id', 'email', 'name', 'token']);
    assert.equal((await request('/api/auth/me', { token: result.body.token })).status, 200);
    const login = await request('/api/auth/login', { method: 'POST', body: { email: 'new@example.test', password: 'Correct-example-123' } });
    assert.equal(login.status, 200);
    assert.equal(login.body._id, result.body._id);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'new@example.test', password: 'Wrong-example-123' } })).status, 401);
  });
  it('maps concurrent duplicate registrations to one 201 and one 409', async () => {
    const options = { method: 'POST', body: { name: 'Duplicate', email: 'duplicate@example.test', password: 'Correct-example-123' } };
    const responses = await Promise.all([request('/api/auth/register', options), request('/api/auth/register', options)]);
    assert.deepEqual(responses.map(result => result.status).sort(), [201, 409]);
    assert.equal(await User.countDocuments({ email: 'duplicate@example.test' }), 1);
  });
  for (const body of [{ email: { $ne: null }, password: 'example' }, { email: 'owner@example.test', password: {} }]) {
    it(`rejects non-string auth input ${JSON.stringify(body)}`, async () => {
      const result = await request('/api/auth/login', { method: 'POST', body });
      assert.equal(result.status, 400);
      assert.equal(typeof result.body.message, 'string');
      assert.equal(result.body.error, undefined);
    });
  }
});

describe('sparse and legacy record compatibility', () => {
  it('preserves missing optional values and string NIP on a notes-only edit', async () => {
    const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { notes: 'Only notes changed' } });
    assert.equal(result.status, 200);
    assert.equal(result.body.nip, '0123456789');
    assert.equal(result.body.phone, '+48 012 345 678');
    for (const key of ['priceColorless', 'priceColor', 'priceUnknown', 'contactDate', 'typeUnknown']) assert.equal(Object.hasOwn(result.body, key), false, key);
    assert.equal(result.body.createdAt, record.createdAt.toISOString());
    assert.equal(result.body.user, String(owner._id));
  });
  it('preserves noon timestamps, higher precision and unknown-material price on unrelated edits', async () => {
    await Contractor.updateOne({ _id: record._id }, { contactDate: new Date('2025-03-30T12:34:56.789Z'), priceColorless: 8.1234567, priceUnknown: 0 });
    const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { notes: 'Only notes changed' } });
    assert.equal(result.status, 200);
    assert.equal(result.body.contactDate, '2025-03-30T12:34:56.789Z');
    assert.equal(result.body.priceColorless, 8.1234567);
    assert.equal(result.body.priceUnknown, 0);
    assert.equal(Object.hasOwn(result.body, 'typeUnknown'), false);
  });
  it('preserves legacy null text values and supports explicit text clearing', async () => {
    await Contractor.updateOne({ _id: record._id }, { notes: null, typeUnknown: null });
    const preserved = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { priceColor: 0 } });
    assert.equal(preserved.status, 200);
    assert.equal(preserved.body.notes, null);
    assert.equal(preserved.body.typeUnknown, null);
    const changed = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { notes: 'Temporary note', typeUnknown: 'Sample material' } });
    assert.equal(changed.status, 200);
    const cleared = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { notes: null, typeUnknown: '' } });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.notes, null);
    assert.equal(cleared.body.typeUnknown, '');
  });
  it('round-trips zero, decimal strings, null and date-only values without rounding', async () => {
    const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { priceColorless: 0, priceColor: '8.1234567', priceUnknown: null, contactDate: '2025-10-26' } });
    assert.equal(result.status, 200);
    assert.equal(result.body.priceColorless, 0);
    assert.equal(result.body.priceColor, 8.1234567);
    assert.equal(result.body.priceUnknown, null);
    assert.equal(result.body.contactDate, '2025-10-26T00:00:00.000Z');
    const cleared = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { priceColor: '', contactDate: null } });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.priceColor, null);
    assert.equal(cleared.body.contactDate, null);
  });
  it('retains finite legacy prices without imposing a new minimum or scale', async () => {
    const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { priceColor: -0.123456 } });
    assert.equal(result.status, 200);
    assert.equal(result.body.priceColor, -0.123456);
  });
  for (const body of [{ priceColor: 'Infinity' }, { nip: 123 }, { name: '' }, { contactDate: '2025-02-30' }, { notes: { $set: 'Wrong' } }, []]) {
    it(`rejects invalid contractor input ${JSON.stringify(body)}`, async () => {
      const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body });
      assert.equal(result.status, 400);
      assert.equal(result.body.error, undefined);
    });
  }
  it('returns safe JSON for invalid IDs and malformed JSON', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const invalid = await request('/api/contractors/invalid-id', { method, token: ownerToken, body: method === 'PUT' ? { notes: 'edit' } : undefined });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error, undefined);
    }
    const malformed = await request('/api/contractors', { method: 'POST', token: ownerToken, rawBody: '{"name":' });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error, undefined);
  });
  it('returns a safe client error for a malformed encoded record ID', async () => {
    const result = await request('/api/contractors/%FF', { token: ownerToken });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, undefined);
  });
  it('preserves field-level validation details through the global error handler', async () => {
    const result = await request(`/api/contractors/${record._id}`, { method: 'PUT', token: ownerToken, body: { nip: 123 } });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'INVALID_INPUT');
    assert.equal(typeof result.body.fields.nip, 'string');
    assert.equal(result.body.error, undefined);
  });
});

describe('validated HTTP boundaries and optional CAPTCHA', () => {
  async function withApp(options, run) {
    const listener = await new Promise(resolve => {
      const instance = makeApp(options).listen(0, '127.0.0.1', () => resolve(instance));
    });
    try { await run(`http://127.0.0.1:${listener.address().port}`); }
    finally { await new Promise(resolve => listener.close(resolve)); }
  }
  it('allows configured CORS origins and rejects foreign origins with safe JSON', async () => {
    await withApp({ config: { jwtSecret: secret, corsOrigins: ['http://localhost:5173'], useRecaptcha: false } }, async baseUrl => {
      const allowed = await request('/api/contractors', { baseUrl, token: ownerToken, headers: { Origin: 'http://localhost:5173' } });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      const denied = await request('/api/contractors', { baseUrl, token: ownerToken, headers: { Origin: 'https://foreign.example.test' } });
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);
      assert.equal(denied.body.error, undefined);
    });
  });
  it('permits same-origin browser POST when the cross-origin allowlist is empty', async () => {
    await withApp({ config: { jwtSecret: secret, corsOrigins: [], useRecaptcha: false } }, async baseUrl => {
      const result = await request('/api/contractors', { baseUrl, method: 'POST', token: ownerToken, headers: { Origin: baseUrl }, body: company });
      assert.equal(result.status, 201);
      assert.equal(result.headers.get('access-control-allow-origin'), baseUrl);
    });
  });
  it('rejects oversized JSON before storing data', async () => {
    const result = await request('/api/contractors', { method: 'POST', token: ownerToken, body: { ...company, notes: 'a'.repeat(40000) } });
    assert.equal(result.status, 413);
    assert.equal(await Contractor.countDocuments(), 1);
  });
  for (const body of [{ name: 'A', email: 'invalid', password: 'Correct-example-123' }, { name: 'A', email: 'short@example.test', password: 'short' }, { name: {}, email: 'object@example.test', password: 'Correct-example-123' }]) {
    it(`rejects invalid registration ${JSON.stringify(body)}`, async () => {
      const result = await request('/api/auth/register', { method: 'POST', body });
      assert.equal(result.status, 400);
      assert.equal(result.body.error, undefined);
    });
  }
  const config = { jwtSecret: secret, corsOrigins: [], useRecaptcha: true, recaptchaSecretKey: 'fictional-secret', recaptchaHostname: 'app.example.test', recaptchaTimeoutMs: 30 };
  const registration = { name: 'CAPTCHA User', email: 'captcha@example.test', password: 'Correct-example-123', captchaToken: 'fictional-token+&' };
  it('requires CAPTCHA only when enabled and validates Google action, hostname and score', async () => {
    const invalid = [
      { success: false, score: 0.9, action: 'register', hostname: 'app.example.test' },
      { success: true, score: '0.9', action: 'register', hostname: 'app.example.test' },
      { success: true, score: 0.9, action: 'login', hostname: 'app.example.test' },
      { success: true, score: 0.9, action: 'register', hostname: 'foreign.example.test' },
      { success: true, score: 0.1, action: 'register', hostname: 'app.example.test' },
    ];
    for (const verdict of invalid) {
      await withApp({ config, fetchImpl: async () => ({ ok: true, json: async () => verdict }) }, async baseUrl => {
        const result = await request('/api/auth/register', { baseUrl, method: 'POST', body: registration });
        assert.equal(result.status, 400);
      });
    }
    assert.equal(await User.countDocuments({ email: registration.email }), 0);
  });
  it('encodes CAPTCHA secrets and tokens in a form POST and establishes a session on success', async () => {
    await withApp({ config, fetchImpl: async (url, options) => {
      assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
      assert.equal(new URLSearchParams(options.body).get('secret'), 'fictional-secret');
      assert.equal(new URLSearchParams(options.body).get('response'), 'fictional-token+&');
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, json: async () => ({ success: true, score: 0.9, action: 'register', hostname: 'app.example.test' }) };
    } }, async baseUrl => {
      const result = await request('/api/auth/register', { baseUrl, method: 'POST', body: registration });
      assert.equal(result.status, 201);
      assert.equal(typeof result.body.token, 'string');
    });
  });
  it('returns a safe service error for CAPTCHA transport failure without storing the user', async () => {
    await withApp({ config, fetchImpl: async () => { throw new Error('private-upstream-secret'); } }, async baseUrl => {
      const result = await request('/api/auth/register', { baseUrl, method: 'POST', body: { ...registration, email: 'captcha-error@example.test' } });
      assert.equal(result.status, 503);
      assert.equal(JSON.stringify(result.body).includes('private-upstream-secret'), false);
      assert.equal(await User.countDocuments({ email: 'captcha-error@example.test' }), 0);
    });
  });
  it('bounds CAPTCHA timeout and rejects a missing token without contacting Google', async () => {
    await withApp({ config, fetchImpl: async (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }) }, async baseUrl => {
      assert.equal((await request('/api/auth/register', { baseUrl, method: 'POST', body: { ...registration, captchaToken: undefined, email: 'captcha-missing@example.test' } })).status, 400);
      const result = await request('/api/auth/register', { baseUrl, method: 'POST', body: { ...registration, email: 'captcha-timeout@example.test' } });
      assert.equal(result.status, 503);
      assert.equal(await User.countDocuments({ email: 'captcha-timeout@example.test' }), 0);
    });
  });
});

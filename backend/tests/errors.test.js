const { it } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { errorHandler, asyncHandler } = require('../errors');

it('does not expose unexpected asynchronous exception details over HTTP', async () => {
  const app = express();
  app.get('/failure', asyncHandler(async () => { throw new Error('private-database-host-and-diagnostics'); }));
  app.use(errorHandler);
  const listener = app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${listener.address().port}/failure`);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(typeof body.message, 'string');
    assert.equal(body.code, 'INTERNAL_ERROR');
    assert.equal(JSON.stringify(body).includes('private-database-host'), false);
    assert.equal(body.error, undefined);
    assert.equal(body.stack, undefined);
  } finally { await new Promise(resolve => listener.close(resolve)); }
});

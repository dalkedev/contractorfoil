const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { readConfig } = require('./config');
const { ApiError, errorHandler } = require('./errors');

function createApp(options = {}) {
  const config = options.config || readConfig();
  const app = express();
  app.disable('x-powered-by');
  app.locals.config = config;
  app.locals.fetchImpl = options.fetchImpl || globalThis.fetch;
  app.locals.shuttingDown = false;
  app.use(cors((req, done) => done(null, {
    origin(origin, callback) {
      const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
      if (!origin || sameOrigin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'],
  })));
  app.use(express.json({ limit: '32kb' }));
  app.get('/', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (req, res) => {
    const ready = !app.locals.shuttingDown && mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
  });
  app.use('/api/auth', require('./routes/authRouter'));
  app.use('/api/contractors', require('./routes/contractorRouter'));
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found.')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

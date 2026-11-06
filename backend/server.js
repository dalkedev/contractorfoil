const mongoose = require('mongoose');
const { createApp } = require('./app');
const { readConfig } = require('./config');
const User = require('./models/userModel');
const Contractor = require('./models/contractorModel');

async function startServer(config = readConfig()) {
  const app = createApp({ config });
  let server;
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: config.databaseTimeoutMs,
      connectTimeoutMS: config.databaseTimeoutMs,
      socketTimeoutMS: 10000,
      bufferCommands: false,
    });
    await Promise.all([User.init(), Contractor.init()]);
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port, config.host, () => resolve(listener));
      listener.once('error', reject);
    });
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;

  let stopping;
  function stop() {
    if (stopping) return stopping;
    app.locals.shuttingDown = true;
    stopping = (async () => {
      let timeout;
      try {
        await Promise.race([
          (async () => {
            await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            await mongoose.disconnect();
          })(),
          new Promise((resolve, reject) => {
            timeout = setTimeout(() => {
              server.closeAllConnections();
              reject(new Error('Shutdown timed out.'));
            }, config.shutdownTimeoutMs);
          }),
        ]);
      } finally { clearTimeout(timeout); }
    })();
    return stopping;
  }
  return { app, server, stop };
}

module.exports = { startServer };

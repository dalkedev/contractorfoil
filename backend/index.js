const { readConfig } = require('./config');
const { startServer } = require('./server');

async function main() {
  // Test processes use only their explicit environment, never local credential files.
  if (process.env.NODE_ENV !== 'test') require('dotenv').config();
  let runtime;
  try {
    runtime = await startServer(readConfig());
    console.log('ContractorFoil API is ready.');
  } catch {
    console.error('API startup failed. Check configuration and database availability.');
    process.exitCode = 1;
    return;
  }
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await runtime.stop();
      process.exit(0);
    } catch {
      console.error('API shutdown exceeded its deadline.');
      process.exit(1);
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) main();
module.exports = { main };

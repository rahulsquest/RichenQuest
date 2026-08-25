/**
 * AppSail production entry point.
 *
 * ROOT CAUSE THIS FILE FIXES
 *   functions/devServer.js only calls app.listen() inside
 *   `if (require.main === module)`. Catalyst's managed Node runtime REQUIRES
 *   the entry file rather than executing it as the main module, so that guard
 *   is false, nothing ever binds, the process exits 0, and the platform
 *   reports "Execution failed. Please check the startup command or port."
 *   with no error from the application — because the application never failed.
 *
 *   devServer.js already exports the Express app. This file imports it and
 *   owns the listen, which works whether the runtime requires or executes it.
 */
const path = require('path');

const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT
  || process.env.CATALYST_LISTEN_PORT
  || process.env.PORT
  || 9000;
const HOST = '0.0.0.0';

// A container that dies silently is the hardest kind to debug; log and stay up.
process.on('uncaughtException',  e => console.error('[fatal] uncaught', e));
process.on('unhandledRejection', e => console.error('[fatal] unhandled', e));

const app = require(path.join(__dirname, 'functions', 'devServer.js'));

app.listen(PORT, HOST, () => {
  console.log(`RichenQuest API listening on ${HOST}:${PORT}`);
});

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
 *
 * PORT BUG FIXED HERE
 *   This file used to read process.env.PORT before devServer.js's own
 *   require('dotenv').config() had run (that call only happens once the
 *   require() below executes), so a local .env's PORT was silently ignored
 *   and the server always fell back to 9000 — confirmed by running it.
 *   dotenv.config() is called here first; it never overwrites an
 *   already-set variable, so Catalyst's injected
 *   X_ZOHO_CATALYST_LISTEN_PORT/CATALYST_LISTEN_PORT are untouched.
 */
const path = require('path');
require('dotenv').config();

const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT
  || process.env.CATALYST_LISTEN_PORT
  || process.env.PORT
  || 9000;
const HOST = '0.0.0.0';

// A container that dies silently is the hardest kind to debug; log and stay up.
process.on('uncaughtException',  e => console.error('[fatal] uncaught', e));
process.on('unhandledRejection', e => console.error('[fatal] unhandled', e));

const app = require(path.join(__dirname, 'functions', 'devServer.js'));
const CatalystDataStore = require(path.join(__dirname, 'functions', 'shared', 'dataStore.js'));

/*  Hydration is awaited before the process binds a port, so no request can
 *  observe an empty store when Catalyst actually has data for it — the
 *  alternative (hydrate in the background after listen()) would let an
 *  early request race the load and see a false "no records yet". */
CatalystDataStore.hydrate().finally(() => {
  app.listen(PORT, HOST, () => {
    console.log(`RichenQuest API listening on ${HOST}:${PORT}`);
  });
});

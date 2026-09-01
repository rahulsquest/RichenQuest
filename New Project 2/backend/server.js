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
 *  early request race the load and see a false "no records yet".
 *
 *  BUT IT IS NOW BOUNDED, AND THAT IS WHY THIS SERVICE WOULD NOT START.
 *  hydrate() walks every table in TABLE_NAMES, and for each one does an
 *  existence probe plus a paginated getIterableRows() — real network calls
 *  inside Catalyst, with no timeout anywhere in that path. Locally it returns
 *  in milliseconds because CATALYST_CONFIG is absent, catalystTable() returns
 *  null and every table is skipped, so this await is free and invisible.
 *  Inside AppSail the config IS injected, the calls are real, and if the Data
 *  Store is slow or those tables do not exist yet, the loop outlives the
 *  platform's startup window. Nothing binds, the application logs no error
 *  because nothing failed, and AppSail reports exactly:
 *      "Execution failed. Please check the startup command or port."
 *  Reproduced locally with the production shape (10 tables, unbounded waits):
 *  the port was still unbound at T+20s.
 *
 *  So the port binding no longer depends on a remote service answering. In
 *  the normal case hydration wins the race well inside the timeout and the
 *  original intent holds; in the pathological case the service comes up with
 *  a cold store, which is a degraded API rather than no API at all. Whichever
 *  happens is logged, and a real hydrate error is still surfaced rather than
 *  swallowed. */
const HYDRATE_TIMEOUT_MS = Number(process.env.HYDRATE_TIMEOUT_MS || 15000);

let listening = false;
function bind(reason) {
  if (listening) return;            // race winner already bound the port
  listening = true;
  app.listen(PORT, HOST, () => {
    console.log(`RichenQuest API listening on ${HOST}:${PORT} (store: ${reason})`);
  });
}

Promise.race([
  CatalystDataStore.hydrate().then(() => 'hydrated'),
  new Promise(resolve => setTimeout(() => resolve('hydrate-timeout'), HYDRATE_TIMEOUT_MS))
])
  .then(outcome => {
    if (outcome === 'hydrate-timeout') {
      console.warn(`[dataStore] hydration exceeded ${HYDRATE_TIMEOUT_MS}ms; binding the port now and continuing to load in the background.`);
    }
    bind(outcome);
  })
  .catch(e => {
    // Not swallowed: a genuine hydrate failure is logged with its message.
    console.error('[dataStore] hydration failed:', e && e.message);
    bind('hydrate-failed');
  });

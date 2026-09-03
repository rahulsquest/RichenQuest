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

/*  THE PORT BINDS FIRST. NOTHING REMOTE GATES IT.
 *
 *  This used to await hydration before listening, capped at 15s. hydrate()
 *  walks every table and does an existence probe plus a paginated
 *  getIterableRows() — real network calls inside Catalyst. Locally that is
 *  invisible: CATALYST_CONFIG is absent, catalystTable() returns null, every
 *  table is skipped and the await costs nothing. Inside AppSail the config IS
 *  injected and the calls are real, so startup could spend up to 15 seconds
 *  not listening. If that outlives the platform's startup window nothing is
 *  bound when it checks, the application logs no error because nothing
 *  failed, and AppSail reports exactly:
 *      "Execution failed. Please check the startup command or port."
 *
 *  A health check cannot pass a port that is not open yet, so binding is now
 *  the very first thing that happens and hydration runs after it, in the
 *  background.
 *
 *  The cost is real and worth stating: a request arriving before hydration
 *  finishes sees a cold store. That is safe here only because the layers
 *  below already tell the truth about it — getStorageMode() reports
 *  IN_MEMORY_FALLBACK until a table's probe genuinely succeeds, and the lead
 *  durability gate refuses to claim success on a non-durable write. A cold
 *  store therefore degrades honestly rather than inventing "no records yet".
 *  A degraded API that answers beats a healthy one that never starts. */

app.listen(PORT, HOST, () => {
  console.log(`RichenQuest API listening on ${HOST}:${PORT} (hydration pending)`);

  /*  Started only once the port is open, and deliberately not awaited. Its
   *  failure is logged, never rethrown — an unhandled rejection here would
   *  take down an HTTP server that is already serving traffic perfectly
   *  well. */
  CatalystDataStore.hydrate()
    .then(() => console.log('[dataStore] hydration complete; Catalyst-backed tables are live.'))
    .catch(e => console.error('[dataStore] hydration failed, continuing with the in-memory store:', e && e.message));
});

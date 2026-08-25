/**
 * RichenQuest Shared Utilities Module
 * Re-exports core response, data store, and Zoho integration client abstractions.
 */

const response = require('../functions/shared/response');
const dataStore = require('../functions/shared/dataStore');
const zohoClient = require('../functions/shared/zohoClient');

module.exports = {
  ...response,
  CatalystDataStore: dataStore,
  ZohoClient: zohoClient
};

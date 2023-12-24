// db/db.js
const { ipcMain } = require('electron');
const { channels } = require('../../src/shared/constants.js');
const knex = require('knex');

let dbPath = '';
let knexInstance = null;
let initializationCallback = null;

ipcMain.on(channels.SET_DB_PATH, (event, databaseFile) => {
  if (!knexInstance) {
    dbPath = databaseFile;

    // Re-initialize knexInstance with the new path
    knexInstance = knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });

    // If there's a callback, invoke it
    if (initializationCallback) {
      initializationCallback(knexInstance);
      initializationCallback = null; // Clear the callback
    }
  }
});

function initializeKnexInstance(callback) {
  // If knexInstance is already available, invoke the callback immediately
  if (knexInstance) {
    callback(knexInstance);
  } else {
    // Set the callback for later invocation
    initializationCallback = callback;
  }
}

// Export the database
module.exports = initializeKnexInstance;

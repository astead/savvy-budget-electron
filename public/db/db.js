// db/db.js
//const sqlite3 = require('sqlite3');

const path = require('path');
//const { ipcRenderer, contextBridge, ipcMain } = require('electron');

const dbPath = path.resolve(__dirname, './db.sqlite');

// Create connection to SQLite database
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
});

// Export the database
module.exports = knex;

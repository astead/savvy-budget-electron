// db/db.js
const { ipcMain, dialog } = require('electron');
const { channels } = require('../../src/shared/constants.js');
const knex = require('knex');

/*
  TODO: 
  - release db connection when changing.
  */

let dbPath = '';
let db = null;
let initializationCallback = null;

ipcMain.on(channels.SET_DB_PATH, async (event, databaseFile) => {
  if (databaseFile === dbPath && db) {
    //console.log('db connection is already set to the same file. ignoring.');
    return;
  }
  if (db) {
    //console.log(
    //  'Someone wants to set DBPath to: ',
    //  databaseFile,
    //  ' but db is not null and currently pointing to: ',
    //  dbPath
    //);

    //console.log('calling db.destroy');
    //db.destroy();
    db = null;
  }
  if (!db) {
    //console.log('setting db path and db is null');
    dbPath = databaseFile;

    // Re-initialize knexInstance with the new path
    //console.log('Setting DB to: ', dbPath);
    db = knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });

    // If there's a callback, invoke it
    if (initializationCallback) {
      //console.log('Calling callback.');
      initializationCallback(db);

      //console.log('Was going to clear the callback.');
      //initializationCallback = null; // Clear the callback
    } else {
      //console.log(
      //  "*******Was going to set knex in callback, but callback doesn't exist."
      //);
    }
    //} else {
    //  console.log('setting db path and db is not null');
  }
});

function initializeKnexInstance(callback) {
  //console.log('Initializeing knex instance.');

  // If knexInstance is already available, invoke the callback immediately
  if (db) {
    //console.log('We have a db: calling callback.');
    callback(db);
  } else {
    //console.log('We dont have a db.');
    // Set the callback for later invocation
    if (!initializationCallback) {
      //console.log('We also didnt have a callback, set it.');
      initializationCallback = callback;
      //} else {
      //  console.log(
      //    'We already have the callback set, now just waiting for the db.'
      //  );
    }
  }
}

ipcMain.on(channels.CREATE_DB, async (event) => {
  console.log(channels.CREATE_DB);

  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Database',
    filters: [{ name: 'SQLite Databases', extensions: ['db'] }],
  });

  if (filePath) {
    // If we were already using a DB, need to close
    // that connection.
    if (db) {
      //console.log('DB was not null when creating new.');
      //await db.destroy();
      db = null;
    }

    // Create our new connection
    //console.log('Setting DB to: ', filePath);
    db = knex({
      client: 'sqlite3',
      connection: {
        filename: filePath,
      },
      useNullAsDefault: true,
    });

    // Create Account Table
    await db.schema.createTable('account', function (table) {
      table.increments('id').primary();
      table.text('account');
      table.text('refNumber');
      table.text('plaid_id');
      table.integer('isActive');
    });

    // Create Category Table
    await db.schema.createTable('category', function (table) {
      table.increments('id').primary();
      table.text('category');
    });

    // Create Envelope Table
    await db.schema.createTable('envelope', function (table) {
      table.increments('id').primary();
      table.text('envelope');
      table.integer('categoryID');
      table.real('balance');
      table.integer('isActive');
    });

    // Create Keyword Table
    await db.schema.createTable('keyword', function (table) {
      table.increments('id').primary();
      table.integer('envelopeID');
      table.text('description');
    });

    // Create Transaction Table
    await db.schema.createTable('transaction', function (table) {
      table.increments('id').primary();
      table.integer('envelopeID');
      table.real('txAmt');
      table.integer('txDate');
      table.text('description');
      table.text('refNumber');
      table.integer('isBudget');
      table.integer('origTxID');
      table.integer('isDuplicate');
      table.integer('isSplit');
      table.integer('accountID');
      table.integer('isVisible');
    });

    // Create PLAID key table
    await db.schema.createTable('plaid', function (table) {
      table.text('client_id');
      table.text('secret');
      table.text('environment');
    });

    // Create PLAID account Table
    await db.schema.createTable('plaid_account', function (table) {
      table.increments('id').primary();
      table.text('institution');
      table.text('account_id');
      table.text('mask');
      table.text('account_name');
      table.text('account_subtype');
      table.text('account_type');
      table.text('verification_status');
      table.text('item_id');
      table.text('access_token');
      table.integer('cursor');
    });

    // Create Version Table
    await db.schema.createTable('version', function (table) {
      table.integer('version');
    });

    // Set the version to 1
    db('version').insert({ version: 3 }).then();

    // Add the Income Category
    db('category').insert({ category: 'Uncategorized' }).then();
    db('category').insert({ category: 'Income' }).then();

    // Add blank plaid info
    db('plaid').insert({ client_id: '', secret: '', environment: '' }).then();

    // Set this as our main instance
    // TODO: Might not need to do this, the callback below
    // will end up triggering a db change along with
    // saving the new filename to local storage.
    if (initializationCallback) {
      //console.log('Calling callback.');
      await initializationCallback(db);
      //} else {
      //  console.log('created new db, but cant call callback.');
    }

    // Now let the renderer know about the new filename
    //console.log('Send this back to the renderer.');
    event.sender.send(channels.LIST_NEW_DB_FILENAME, filePath);
  }
});

// Export the database
module.exports = initializeKnexInstance;

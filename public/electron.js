const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev'); // To check if electron is in development mode
const path = require('path');
const { channels } = require('../src/shared/constants.js');
const dayjs = require('dayjs');
const { BankTransferList, Ofx } = require('ofx-convert');
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser');
const knex = require('knex');

const { auth, OAuth2Client } = require('google-auth-library');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const http = require('http');
const url = require('url');
const opn = require('opn');
const destroyer = require('server-destroy');

const fs = require('fs');
const readline = require('readline');

const latest_DB_version = 5;

let usingGoogleDrive = false;
let googleCredentials = null;
let googleTokens = null;
let googleAuth = null;
let googleClient = null;
let googleFileID = null;
let haveGoogleDriveFile = false;
let googleGettingFile = false;
let googleDrivefileName = null;

/*
  TODO:
  - consolidate redundant work?
  - use transactions for anything requiring multiple DB calls.
*/

let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Savvy Budget',
    icon: isDev
      ? path.join(app.getAppPath(), './public/favicon.ico') // Loading it from the public folder for dev
      : path.join(app.getAppPath(), './build/favicon.ico'),
    //frame: false,
    webPreferences: {
      // The preload file where we will perform our app communication
      preload: isDev
        ? path.join(app.getAppPath(), './public/preload.js') // Loading it from the public folder for dev
        : path.join(app.getAppPath(), './build/preload.js'), // Loading it from the build folder for production
      worldSafeExecuteJavaScript: true, // If you're using Electron 12+, this should be enabled by default and does not need to be added here.
      contextIsolation: true, // Isolating context so our app is not exposed to random javascript executions making it safer.
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  win.removeMenu();

  //load the index.html from a url
  win.loadURL(
    isDev
      ? 'http://localhost:3000' // Loading localhost if dev mode
      : `file://${path.join(__dirname, '../build/index.html')}` // Loading build file if in production
  );

  // Replace YOUR_WINDOW and modify the line that loads the URL
  // (the same way you load URL when the window is created)
  win.webContents.on('did-fail-load', () => {
    if (process.env.NODE_ENV === 'production') {
      win.loadURL('app://./index.html');
    }
  });

  if (isDev) {
    win.webContents.openDevTools();
  }
}

// ((OPTIONAL)) Setting the location for the userdata folder created by an Electron app. It default to the AppData folder if you don't set it.
app.setPath(
  'userData',
  isDev
    ? path.join(app.getAppPath(), 'userdata/') // In development it creates the userdata folder where package.json is
    : path.join(process.resourcesPath, 'userdata/') // In production it creates userdata folder in the resources folder
);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (usingGoogleDrive && haveGoogleDriveFile) {
      await push_GDrive_file();
    }
    app.quit();
  }
});

app.on('before-quit', async (e) => {
  if (usingGoogleDrive && haveGoogleDriveFile) {
    await push_GDrive_file();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Logging any exceptions
process.on('uncaughtException', async (error) => {
  console.log(`Exception: ${error}`);
  if (process.platform !== 'darwin') {
    if (usingGoogleDrive && haveGoogleDriveFile) {
      await push_GDrive_file();
    }
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let dbPath = '';
let db = null;

const set_db = async (DBPath) => {
  if (DBPath === dbPath && db) {
    //console.log('db connection is already set to the same file. ignoring.');
    return;
  }
  if (db) {
    await db.destroy();
    db = null;
  }
  if (!db) {
    dbPath = DBPath;

    // Re-initialize knexInstance with the new path
    db = knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });
  }
};

ipcMain.on(channels.SET_DB_PATH, async (event, { DBPath }) => {
  await set_db(DBPath);
  event.sender.send(channels.DONE_SET_DB_PATH);
});

const create_local_db = async (filePath) => {
  if (filePath) {
    // If we were already using a DB, need to close
    // that connection.
    if (db) {
      await db.destroy();
      db = null;
    }

    // Create our new connection
    //console.log('Setting DB to: ', filePath);
    db = await knex({
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
      table.text('account');
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
      table.text('token');
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
    db('version').insert({ version: 5 }).then();

    // Add the Income Category
    db('category').insert({ category: 'Uncategorized' }).then();
    db('category').insert({ category: 'Income' }).then();

    // Add blank plaid info
    db('plaid').insert({ client_id: '', secret: '', environment: '' }).then();
  }
};

ipcMain.on(channels.CREATE_DB, async (event) => {
  console.log(channels.CREATE_DB);

  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Database',
    filters: [{ name: 'SQLite Databases', extensions: ['db'] }],
  });

  await create_local_db(filePath);

  // Now let the renderer know about the new filename
  //console.log('Send this back to the renderer.');
  event.sender.send(channels.LIST_NEW_DB_FILENAME, filePath);
});

const update_local_db = async () => {
  if (db) {
    let cur_ver = await get_db_ver();

    if (cur_ver && cur_ver.toString() === '4') {
      // Need to add the token column to the plaid table
      await db.schema.table('plaid', (table) => {
        table.string('token');
      });

      // update version to 5
      await db('version').update({ version: 5 }).then();
      cur_ver = '5';
    }
  }
};

ipcMain.on(channels.UPDATE_DB, async (event) => {
  console.log(channels.UPDATE_DB);

  await update_local_db();

  // Now let the renderer know about the new filename
  //console.log('Send this back to the renderer.');
  event.sender.send(channels.DONE_UPDATE_DB);
});

const {
  Configuration,
  PlaidApi,
  Products,
  PlaidEnvironments,
} = require('plaid');
const { LogExit } = require('concurrently');

const APP_PORT = process.env.APP_PORT || 8000;
let PLAID_CLIENT_ID = '';
let PLAID_SECRET = '';
let PLAID_ENV = '';

// PLAID_PRODUCTS is a comma-separated list of products to use when initializing
// Link. Note that this list must contain 'assets' in order for the app to be
// able to create and retrieve asset reports.
const PLAID_PRODUCTS = [Products.Transactions, Products.Auth];

// PLAID_COUNTRY_CODES is a comma-separated list of countries for which users
// will be able to select institutions from.
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(
  ','
);

// Parameters used for the OAuth redirect Link flow.
//
// Set PLAID_REDIRECT_URI to 'http://localhost:3000'
// The OAuth redirect flow requires an endpoint on the developer's website
// that the bank website should redirect to. You will need to configure
// this redirect URI for your client ID through the Plaid developer dashboard
// at https://dashboard.plaid.com/team/api.
const PLAID_REDIRECT_URI =
  process.env.PLAID_REDIRECT_URI || 'https://localhost:3000';

// Parameter used for OAuth in Android. This should be the package name of your app,
// e.g. com.plaid.linksample
const PLAID_ANDROID_PACKAGE_NAME = process.env.PLAID_ANDROID_PACKAGE_NAME || '';

// Initialize the Plaid client
// Find your API keys in the Dashboard (https://dashboard.plaid.com/account/keys)

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(configuration);

const configs = {
  user: {
    // This should correspond to a unique id for the current user.
    client_user_id: '2',
  },
  client_name: 'Savvy Budget',
  products: PLAID_PRODUCTS,
  country_codes: PLAID_COUNTRY_CODES,
  language: 'en',
};

if (PLAID_REDIRECT_URI !== '') {
  configs.redirect_uri = PLAID_REDIRECT_URI;
}

if (PLAID_ANDROID_PACKAGE_NAME !== '') {
  configs.android_package_name = PLAID_ANDROID_PACKAGE_NAME;
}

ipcMain.on(
  channels.PLAID_SET_ACCESS_TOKEN,
  async (event, { public_token, metadata }) => {
    console.log('Try getting plaid access token');

    try {
      const response = await client.itemPublicTokenExchange({
        public_token: public_token,
      });

      // These values should be saved to a persistent database and
      // associated with the currently signed-in user
      const access_token = response.data.access_token;
      const itemID = response.data.item_id;

      metadata.accounts.forEach((account, index) => {
        db('account')
          .insert({
            account:
              metadata.institution.name +
              '-' +
              account.name +
              '-' +
              account.mask,
            refNumber:
              metadata.institution.name +
              '-' +
              account.name +
              '-' +
              account.mask,
            plaid_id: account.id,
            isActive: 1,
          })
          .then(() => {
            db('plaid_account')
              .insert({
                institution: metadata.institution.name,
                account_id: account.id,
                mask: account.mask,
                account_name: account.name,
                account_subtype: account.subtype,
                account_type: account.type,
                verification_status: account.verification_status,
                item_id: itemID,
                access_token: access_token,
                cursor: null,
              })
              .then(() => {
                console.log('Added PLAID account ');
              })
              .catch((err) => console.log('Error: ' + err));
          })
          .catch((err) => console.log('Error: ' + err));
      });
    } catch (error) {
      // handle error
      console.log('Error: ', error);
    }
  }
);

ipcMain.on(
  channels.PLAID_GET_TRANSACTIONS,
  async (event, { access_token, cursor }) => {
    console.log('Try getting plaid account transactions ');

    let added = [];
    let modified = [];
    let removed = [];
    let hasMore = true;

    while (hasMore) {
      console.log('Making the call ');
      let response = null;
      try {
        response = await client.transactionsSync({
          access_token: access_token,
          cursor: cursor,
        });
      } catch (e) {
        console.log('Error: ', e.response.data.error_message);
        event.sender.send(channels.UPLOAD_PROGRESS, 100);
        event.sender.send(channels.PLAID_LIST_TRANSACTIONS, e.response.data);
        return;
      }
      console.log('Response: ' + response);
      const data = response.data;
      console.log(' Response: ', data);

      // Add this page of results
      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);
      hasMore = data.has_more;

      // Update cursor to the next cursor
      cursor = data.next_cursor;
    }

    console.log('Done getting the data, now processing');

    let total_records = added.length + modified.length + removed.length;
    let cur_record = 0;

    // Apply added
    const accountArr = [];
    for (const [i, a] of added.entries()) {
      let account_str = a.account_id;
      let accountID = '';
      if (accountArr?.length) {
        const found = accountArr.find((e) => e.name === account_str);
        if (found) {
          accountID = found.id;
        } else {
          accountID = await lookup_plaid_account(account_str);
          accountArr.push({ name: account_str, id: accountID });
        }
      } else {
        accountID = await lookup_plaid_account(account_str);
        accountArr.push({ name: account_str, id: accountID });
      }

      let envID = await lookup_keyword(accountID, a.name);

      await basic_insert_transaction_node(
        accountID,
        -1 * a.amount,
        a.date,
        a.name,
        a.transaction_id,
        envID
      );

      cur_record++;
      event.sender.send(
        channels.UPLOAD_PROGRESS,
        (cur_record * 100) / total_records
      );
    }

    // Apply removed
    for (const [i, r] of removed.entries()) {
      await basic_remove_transaction_node(access_token, r.transaction_id);

      cur_record++;
      event.sender.send(
        channels.UPLOAD_PROGRESS,
        (cur_record * 100) / total_records
      );
    }

    // Apply modified
    for (const [i, m] of modified.entries()) {
      let account_str = m.account_id;
      let accountID = '';
      if (accountArr?.length) {
        const found = accountArr.find((e) => e.name === account_str);
        if (found) {
          accountID = found.id;
        } else {
          accountID = await lookup_plaid_account(account_str);
          accountArr.push({ name: account_str, id: accountID });
        }
      } else {
        accountID = await lookup_plaid_account(account_str);
        accountArr.push({ name: account_str, id: accountID });
      }

      let envID = await lookup_keyword(accountID, m.name);

      // Rather than modify it, just remove the old and the new
      // TODO: Not sure how much faster it would be to just update
      await basic_remove_transaction_node(access_token, m.transaction_id);

      await basic_insert_transaction_node(
        accountID,
        -1 * m.amount,
        m.date,
        m.name,
        m.transaction_id,
        envID
      );

      cur_record++;
      event.sender.send(
        channels.UPLOAD_PROGRESS,
        (cur_record * 100) / total_records
      );
    }

    // Update cursor
    db('plaid_account')
      .where('access_token', access_token)
      .update('cursor', cursor)
      .catch((err) => console.log('Error: ' + err));

    event.sender.send(channels.UPLOAD_PROGRESS, 100);
  }
);

ipcMain.on(
  channels.PLAID_FORCE_TRANSACTIONS,
  async (event, { access_token, start_date, end_date }) => {
    console.log('Try getting plaid account transactions ');

    let added = [];

    console.log('Making the call ');
    let response = null;
    try {
      response = await client.transactionsGet({
        access_token: access_token,
        start_date: start_date,
        end_date: end_date,
      });
    } catch (e) {
      console.log('Error: ', e.response.data.error_message);
      event.sender.send(channels.UPLOAD_PROGRESS, 100);
      event.sender.send(channels.PLAID_LIST_TRANSACTIONS, e.response.data);
      return;
    }
    console.log('Response: ' + response);
    const data = response.data;
    console.log(' Response: ', data);
    let transactions = response.data.transactions;
    const total_transactions = response.data.total_transactions;

    // Add this page of results
    added = added.concat(transactions);

    while (transactions.length < total_transactions) {
      const paginatedRequest = {
        access_token: access_token,
        start_date: start_date,
        end_date: end_date,
        options: {
          offset: transactions.length,
        },
      };

      const paginatedResponse = await client.transactionsGet(paginatedRequest);
      added = added.concat(paginatedResponse.data.transactions);
    }

    console.log('Done getting the data, now processing');

    let total_records = added.length;
    let cur_record = 0;

    // Apply added
    const accountArr = [];
    for (const [i, a] of added.entries()) {
      let account_str = a.account_id;
      let accountID = '';
      if (accountArr?.length) {
        const found = accountArr.find((e) => e.name === account_str);
        if (found) {
          accountID = found.id;
        } else {
          accountID = await lookup_plaid_account(account_str);
          accountArr.push({ name: account_str, id: accountID });
        }
      } else {
        accountID = await lookup_plaid_account(account_str);
        accountArr.push({ name: account_str, id: accountID });
      }

      let envID = await lookup_keyword(accountID, a.name);

      await basic_insert_transaction_node(
        accountID,
        -1 * a.amount,
        a.date,
        a.name,
        a.transaction_id,
        envID
      );

      cur_record++;
      event.sender.send(
        channels.UPLOAD_PROGRESS,
        (cur_record * 100) / total_records
      );
    }

    event.sender.send(channels.UPLOAD_PROGRESS, 100);
  }
);

ipcMain.on(
  channels.DRIVE_DELETE_LOCK,
  async (event, { credentials, tokens }) => {
    console.log(channels.DRIVE_DELETE_LOCK);
    await delete_lock_file();
    event.sender.send(channels.DRIVE_DONE_DELETE_LOCK);
  }
);

const drive_authenticate = async (credentials) => {
  console.log('calling getAuthenticatedClient');
  const oAuth2Client = await getAuthenticatedClient(credentials.installed);

  // Verify the id_token, and access the claims.
  const ticket = await oAuth2Client.verifyIdToken({
    idToken: oAuth2Client.credentials.id_token,
    audience: credentials.installed.client_id,
  });
  console.log('got token:' + ticket);

  // After acquiring an access_token, you may want to check on the audience, expiration,
  // or original scopes requested.  You can do that with the `getTokenInfo` method.
  const tokenInfo = await oAuth2Client.getTokenInfo(
    oAuth2Client.credentials.access_token
  );
  console.log('token info: ' + tokenInfo);
  return oAuth2Client.credentials;
};

const drive_find_DB = async () => {
  console.log('querying list of files');
  if (googleClient) {
    let file_list = null;

    try {
      const res = await googleClient.files.list({
        q: "name='SavvyBudget.db' and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
      });
      file_list = res.data.files;
      console.log('Got ' + file_list?.length + ' files.');
      return { file_list: file_list };
    } catch (err) {
      console.log(err);
      return {};
    }
  } else {
    console.log(
      'Was trying to look up DB on Google Drive but googleClient is null.'
    );
    return {};
  }
};

const delete_lock_file = async () => {
  console.log('delete_lock_file');
  if (googleClient) {
    let file_list = null;
    try {
      const res = await googleClient.files.list({
        q: "name='SavvyBudget.db.lock'",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
      });
      file_list = res.data.files;
      console.log('Found ' + file_list?.length + ' lock files.');
      for (const item of file_list) {
        console.log('deleting: ', item.id);
        await googleClient.files.delete({
          fileId: item.id,
        });
      }
    } catch (err) {
      console.log('Error in delete_lock_file: ', err);
    }
  } else {
    console.log(
      'Was trying to delete the lock file on Google Drive but googleClient is null.'
    );
  }
};

const create_lock_file = async () => {
  console.log('create_lock_file');
  if (googleClient) {
    try {
      const requestBody = {
        name: 'SavvyBudget.db.lock',
        fields: 'id',
      };
      const media = {
        mimeType: 'text/plain',
        body: '1',
      };

      const res = await googleClient.files.create({
        requestBody,
        media: media,
      });

      console.log(res.data);
    } catch (err) {
      console.log(err);
    }
  } else {
    console.log(
      'Was trying to create the lock file on Google Drive but googleClient is null.'
    );
  }
};

const find_lock_file = async () => {
  console.log('find_lock_file');
  if (googleClient) {
    let file_list = null;
    try {
      const res = await googleClient.files.list({
        q: "name='SavvyBudget.db.lock' and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
      });
      file_list = res.data.files;
      console.log('Found ' + file_list?.length + ' active lock files.');
      return file_list?.length;
    } catch (err) {
      console.log(err);
      return -1;
    }
  } else {
    console.log(
      'Was trying to search for the lock file on Google Drive but googleClient is null.'
    );
  }
};

const set_google_auth = async () => {
  if (!googleAuth) {
    console.log('splitting out googleCredentials: ', googleCredentials);
    const { client_secret, client_id, redirect_uris } = googleCredentials;
    console.log('Creating oAuth2Client');
    const oAuth2Client = await new OAuth2Client(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    console.log('setting tokens');
    await oAuth2Client.setCredentials(googleTokens);
    googleAuth = oAuth2Client;
  }
};

const set_google_service = async () => {
  if (!googleAuth) {
    await set_google_auth();
  }
  if (googleAuth && !googleClient) {
    googleClient = await google.drive({ version: 'v3', auth: googleAuth });
  }
};

const push_GDrive_file = async () => {
  console.log('push_GDrive_file');

  await set_google_service();

  if (!googleClient) {
    console.log("Error: We don't have the google service.");
  }

  console.log('pushing the file');
  const fileName = isDev
    ? path.join(app.getAppPath(), './public/SavvyBudget.db')
    : path.join(process.resourcesPath, './SavvyBudget.db');

  if (!googleFileID) {
    const { file_list } = await drive_find_DB();
    console.log('drive_find_DB returned: ', file_list);
    if (file_list?.length) {
      googleFileID = file_list[0].id;
    }
  }

  try {
    const fileSize = fs.statSync(fileName).size;
    const res = await googleClient.files.update(
      {
        uploadType: 'media',
        fileId: googleFileID,
        requestBody: {
          // a requestBody element is required if you want to use multipart
        },
        media: {
          body: fs.createReadStream(fileName),
        },
      },
      {
        // Use the `onUploadProgress` event from Axios to track the
        // number of bytes uploaded to this point.
        onUploadProgress: (evt) => {
          const progress = (evt.bytesRead / fileSize) * 100;
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`${Math.round(progress)}% complete`);
        },
      }
    );
    console.log(res.data);

    // Delete lock file
    await delete_lock_file();

    // Disconnect local DB?
    console.log('clearing google variables');
    usingGoogleDrive = false;
    googleCredentials = null;
    googleTokens = null;
    googleAuth = null;
    googleClient = null;
    googleFileID = null;
    haveGoogleDriveFile = false;
    googleDrivefileName = null;
    await db.destroy();
  } catch (err) {
    console.log('Error in push_GDrive_file: ', err);
  }
};

const get_GDrive_file = async () => {
  console.log('electron: get_GDrive_file: ENTER');

  if (!haveGoogleDriveFile) {
    console.log("We don't have the GDrive file, need to get it");

    if (!googleAuth) {
      googleGettingFile = false;
      console.log('We could not get the google authorization');
      return {
        error: 'We could not get the google authorization',
        fileName: '',
      };
    }
    if (!googleClient) {
      googleGettingFile = false;
      console.log('We do not have the google service running');
      return {
        error: 'We do not have the google service running',
        fileName: '',
      };
    }

    const fileName = isDev
      ? path.join(app.getAppPath(), './public/SavvyBudget.db')
      : path.join(process.resourcesPath, './SavvyBudget.db');

    console.log('Find the DB file on GDrive');
    const { file_list } = await drive_find_DB();
    console.log('drive_find_DB returned: ', file_list);
    let fileId = null;
    if (file_list?.length) {
      fileId = file_list[0].id;
    }

    let already_downloaded_file = false;

    if (!fileId) {
      // We did not find the DB file

      let localDBFile = '';

      // Were we already using a DB file?
      if (dbPath) {
        localDBFile = dbPath;
      } else {
        // If not, let's create a new local DB
        // Check if a local file with the same name exists
        if (!fs.existsSync(fileName)) {
          await create_local_db(fileName);
        }
        localDBFile = fileName;
      }

      // Now that we have a local DB, let's upload
      // this DB to Drive and get the fileId
      const fileSize = fs.statSync(localDBFile).size;
      const requestBody = {
        name: 'SavvyBudget.db',
        fields: 'id',
      };
      const media = {
        body: fs.createReadStream(fileName),
      };

      const res = await googleClient.files.create(
        {
          uploadType: 'media',
          requestBody,
          media: media,
        },
        {
          // Use the `onUploadProgress` event from Axios to track the
          // number of bytes uploaded to this point.
          onUploadProgress: (evt) => {
            const progress = (evt.bytesRead / fileSize) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${Math.round(progress)}% complete`);
          },
        }
      );
      console.log(res.data);
      if (res?.data?.id) {
        fileId = res.data.id;
      }

      // if we still don't have a fileId return an error
      if (!fileId) {
        googleGettingFile = false;
        console.log('We could not get the fileId');
        return {
          error: 'We could not get the fileId',
          fileName: '',
        };
      }
      already_downloaded_file = true;
    }

    if (fileId) {
      console.log('We have the fileId: ', fileId);
      usingGoogleDrive = true;
      googleFileID = fileId;

      console.log('getting the file');

      // Check if a lock file exists
      const have_lock_file = await find_lock_file();

      // Get the DB file
      if (!have_lock_file) {
        try {
          if (!already_downloaded_file) {
            const file = await googleClient.files
              .get(
                {
                  fileId: fileId,
                  alt: 'media',
                },
                { responseType: 'stream' }
              )
              .then((res) => {
                return new Promise((resolve, reject) => {
                  console.log(`writing to ${fileName}`);
                  const dest = fs.createWriteStream(fileName);
                  let progress = 0;

                  res.data
                    .on('end', () => {
                      console.log('Done downloading file.');
                      resolve(fileName);
                    })
                    .on('error', (err) => {
                      console.error('Error downloading file.');
                      reject(err);
                    })
                    .on('data', (d) => {
                      progress += d.length;
                      if (process.stdout.isTTY) {
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        process.stdout.write(`Downloaded ${progress} bytes`);
                      }
                    })
                    .pipe(dest);
                });
              });
            console.log(file);
          }

          // Use the DB
          set_db(fileName);

          googleDrivefileName = fileName;

          // Create a lock file
          await create_lock_file();

          console.log('Set that we now have the GDrive DB file.');
          haveGoogleDriveFile = true;
          googleGettingFile = false;

          console.log('Success return!');
          return { fileName: fileName, error: '' };
        } catch (err) {
          console.log(err);
          googleGettingFile = false;
          console.log('Try catch error:', err);
          return { error: err, fileName: '' };
        }
      } else {
        googleGettingFile = false;
        console.log('Lock file already exists');
        return {
          error:
            'Lock file already exists (found ' +
            have_lock_file +
            ' lock file[s])',
          fileName: '',
        };
      }
    }
  } else {
    googleGettingFile = false;
    console.log('We already have the file');
    return {
      error: '',
      fileName: googleDrivefileName,
    };
  }
};

ipcMain.on(channels.DRIVE_AUTH, async (event, { credentials }) => {
  console.log(channels.DRIVE_AUTH);
  event.sender.send(channels.DRIVE_DONE_AUTH, {
    return_creds: await drive_authenticate(credentials),
  });
});

ipcMain.on(
  channels.DRIVE_LIST_FILES,
  async (event, { credentials, tokens }) => {
    console.log(channels.DRIVE_LIST_FILES, credentials, tokens);
    event.sender.send(channels.DRIVE_DONE_LIST_FILES, await drive_find_DB());
  }
);

ipcMain.on(channels.DRIVE_GET_FILE, async (event, { credentials, tokens }) => {
  console.log(channels.DRIVE_GET_FILE);
  if (!googleGettingFile) {
    googleGettingFile = true;
    googleCredentials = credentials.installed;
    googleTokens = tokens;
    await set_google_auth();
    await set_google_service();
    googleClient = await google.drive({ version: 'v3', auth: googleAuth });

    event.sender.send(
      channels.DRIVE_DONE_GET_FILE,
      await get_GDrive_file(credentials, tokens)
    );
  } else {
    console.log('Another thread is trying to get the DB file.');
    //event.sender.send(channels.DRIVE_DONE_GET_FILE, {
    //  error: 'Another thread is trying to get the DB file.',
    //  fileName: '',
    //});
  }
});

ipcMain.on(channels.DRIVE_STOP_USING, async (event) => {
  console.log(channels.DRIVE_STOP_USING);
  await delete_lock_file();
  usingGoogleDrive = false;
  googleCredentials = null;
  googleTokens = null;
  googleAuth = null;
  googleClient = null;
  googleFileID = null;
  haveGoogleDriveFile = false;
  googleDrivefileName = null;
});

ipcMain.on(channels.DRIVE_PUSH_FILE, async (event) => {
  console.log(channels.DRIVE_PUSH_FILE);
  await push_GDrive_file();
  event.sender.send(channels.DRIVE_DONE_PUSH_FILE);
});

ipcMain.on(channels.DRIVE_USE_FILE, async (event) => {
  console.log(channels.DRIVE_USE_FILE);
  const fileName = isDev
    ? path.join(app.getAppPath(), './public/SavvyBudget.db')
    : path.join(process.resourcesPath, './SavvyBudget.db');
  event.sender.send(channels.DRIVE_DONE_USE_FILE, { fileName });
});

/**
 * Create a new OAuth2Client, and go through the OAuth2 content
 * workflow.  Return the full client to the callback.
 */
function getAuthenticatedClient(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials;

  return new Promise((resolve, reject) => {
    console.log('setting up OAuth2Client');
    // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
    // which should be downloaded from the Google Developers Console.
    const oAuth2Client = new OAuth2Client(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    console.log('calling generateAuthUrl');
    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    console.log('creating server');
    // Open an http server to accept the oauth callback. In this simple example, the
    // only request to our webserver is to /oauth2callback?code=<code>
    const server = http
      .createServer(async (req, res) => {
        try {
          //if (req.url.indexOf('/oauth2callback') > -1) {
          //console.log('index is  > -1');

          // acquire the code from the querystring, and close the web server.
          const qs = new url.URL(req.url, 'http://127.0.0.1:3001').searchParams;
          const code = qs.get('code');
          console.log(`Code is ${code}`);
          res.end('Authentication successful! Please close this window.');
          server.destroy();

          // Now that we have the code, use that to acquire tokens.
          console.log('getting token from code');
          const r = await oAuth2Client.getToken(code);
          console.log('got token: ' + r.tokens);

          console.log('storing tokens');
          // Make sure to set the credentials on the OAuth2 client.
          oAuth2Client.setCredentials(r.tokens);
          console.info('Tokens stored.');

          resolve(oAuth2Client);
          //} else {
          //  console.log('index is less than 0');
          //  console.log(res);
          //}
        } catch (e) {
          reject(e);
        }
      })
      .listen(3001, () => {
        console.log('opening the browser?');
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl, { wait: false }).then((cp) => cp.unref());
      });
    destroyer(server);
  });
}

ipcMain.on(
  channels.UPDATE_TX_ENV_LIST,
  async (event, { new_value, filtered_nodes }) => {
    console.log(channels.UPDATE_TX_ENV_LIST);
    for (let t of filtered_nodes) {
      await update_tx_env(t.txID, new_value);
    }

    event.sender.send(channels.DONE_UPDATE_TX_ENV_LIST);
  }
);

ipcMain.on(channels.DEL_TX_LIST, async (event, { del_tx_list }) => {
  console.log(channels.DEL_TX_LIST);
  if (db) {
    console.log(del_tx_list);
    for (let t of del_tx_list) {
      if (t.isChecked) {
        console.log('deleting: ' + t.txID);
        await remove_transaction(t.txID);
      }
    }
  }
  console.log('Sending we are done.');
  event.sender.send(channels.DONE_DEL_TX_LIST);
});

ipcMain.on(channels.SPLIT_TX, async (event, { txID, split_tx_list }) => {
  console.log(channels.SPLIT_TX);
  if (db) {
    // Lets use a transaction for this
    await db
      .transaction(async (trx) => {
        // Get some info on the original
        await trx
          .select(
            'id',
            'envelopeID',
            'txAmt',
            'accountID',
            'refNumber',
            'origTxID',
            'isVisible',
            'isDuplicate'
          )
          .from('transaction')
          .where({ id: txID })
          .then(async (data) => {
            if (data?.length) {
              // Delete the original
              await trx('transaction')
                .delete()
                .where({ id: txID })
                .then(async () => {
                  // Update the original budget
                  await trx
                    .raw(
                      `UPDATE 'envelope' SET balance = balance - ` +
                        data[0].txAmt +
                        ` WHERE id = ` +
                        data[0].envelopeID
                    )
                    .then(async () => {
                      // Loop through each new split
                      for (let item of split_tx_list) {
                        // Insert the new transaction
                        await trx('transaction')
                          .insert({
                            envelopeID: item.txEnvID,
                            txAmt: item.txAmt,
                            txDate: item.txDate,
                            description: item.txDesc,
                            refNumber: data[0].refNumber,
                            isBudget: 0,
                            origTxID: data[0].origTxID
                              ? data[0].origTxID
                              : txID,
                            isDuplicate: data[0].isDuplicate,
                            isSplit: 1,
                            accountID: data[0].accountID,
                            isVisible: data[0].isVisible,
                          })
                          .then(async () => {
                            // Adjust that envelope balance
                            await trx.raw(
                              `UPDATE 'envelope' SET balance = balance + ` +
                                item.txAmt +
                                ` WHERE id = ` +
                                item.txEnvID
                            );
                          });
                      }
                    });
                });
            }
          })
          .then(trx.commit);
      })
      .catch(function (error) {
        console.error(error);
      });
  }
});

ipcMain.on(channels.PLAID_GET_KEYS, (event) => {
  console.log(channels.PLAID_GET_KEYS);
  if (db) {
    db.select('client_id', 'secret', 'environment', 'token')
      .from('plaid')
      .then((data) => {
        PLAID_CLIENT_ID = data[0].client_id.trim();
        PLAID_SECRET = data[0].secret.trim();
        PLAID_ENV = data[0].environment.trim();

        client.configuration.baseOptions.headers['PLAID-CLIENT-ID'] =
          PLAID_CLIENT_ID;
        client.configuration.baseOptions.headers['PLAID-SECRET'] = PLAID_SECRET;
        client.configuration.basePath = PlaidEnvironments[PLAID_ENV];

        if (data[0].token) {
          client.linkTokenCreate(configs);
        }

        event.sender.send(channels.PLAID_LIST_KEYS, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.PLAID_GET_TOKEN, async (event) => {
  console.log('Try getting PLAID link token');
  if (PLAID_CLIENT_ID?.length) {
    try {
      const createTokenResponse = await client.linkTokenCreate(configs);

      if (db) {
        db('plaid')
          .update('token', createTokenResponse.data.link_token)
          .then()
          .catch((err) => console.log(err));
      }

      event.sender.send(channels.PLAID_LIST_TOKEN, createTokenResponse.data);
    } catch (error) {
      console.log(error);
      // handle error
      console.log('Error: ', error.response.data.error_message);
      event.sender.send(channels.PLAID_LIST_TOKEN, error.response.data);
    }
  } else {
    event.sender.send(channels.PLAID_LIST_TOKEN, null);
  }
});

ipcMain.on(
  channels.PLAID_SET_KEYS,
  (event, { client_id, secret, environment }) => {
    console.log(channels.PLAID_SET_KEYS);

    PLAID_CLIENT_ID = client_id.trim();
    PLAID_SECRET = secret.trim();
    PLAID_ENV = environment.trim();

    client.configuration.baseOptions.headers['PLAID-CLIENT-ID'] =
      PLAID_CLIENT_ID;
    client.configuration.baseOptions.headers['PLAID-SECRET'] = PLAID_SECRET;
    client.configuration.basePath = PlaidEnvironments[PLAID_ENV];

    if (db) {
      db.select('client_id')
        .from('plaid')
        .then((rows) => {
          if (rows?.length) {
            db('plaid')
              .update('client_id', client_id)
              .update('secret', secret)
              .update('environment', environment)
              .then()
              .catch((err) => console.log(err));
          } else {
            db('plaid')
              .insert({
                client_id: client_id,
                secret: secret,
                environment: environment,
              })
              .then()
              .catch((err) => console.log(err));
          }
        })
        .catch((err) => console.log(err));
    }
  }
);

ipcMain.on(channels.PLAID_GET_ACCOUNTS, (event) => {
  console.log(channels.PLAID_GET_ACCOUNTS);
  if (db) {
    let query = db
      .select(
        'plaid_account.id',
        'plaid_account.institution',
        'plaid_account.account_id',
        'plaid_account.mask',
        'plaid_account.account_name',
        'plaid_account.account_subtype',
        'plaid_account.account_type',
        'plaid_account.verification_status',
        'plaid_account.item_id',
        'plaid_account.access_token',
        'plaid_account.cursor'
      )
      .max({ lastTx: 'txDate' })
      .from('plaid_account')
      .join('account', 'plaid_account.account_id', 'account.plaid_id')
      .leftJoin('transaction', function () {
        this.on('account.id', '=', 'transaction.accountID')
          .on('transaction.isBudget', '=', 0)
          .on('transaction.isVisible', '=', 1)
          .on('transaction.isDuplicate', '=', 0);
      })
      .orderBy('institution', 'public_token')
      .groupBy(
        'plaid_account.id',
        'plaid_account.institution',
        'plaid_account.account_id',
        'plaid_account.mask',
        'plaid_account.account_name',
        'plaid_account.account_subtype',
        'plaid_account.account_type',
        'plaid_account.verification_status',
        'plaid_account.item_id',
        'plaid_account.access_token',
        'plaid_account.cursor'
      );
    query
      .then((data) => {
        event.sender.send(channels.PLAID_LIST_ACCOUNTS, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.ADD_ENVELOPE, async (event, { categoryID }) => {
  console.log(channels.ADD_ENVELOPE, categoryID);

  await db('envelope')
    .insert({
      categoryID: categoryID,
      envelope: 'New Envelope',
      balance: 0,
      isActive: 1,
    })
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });

  event.sender.send(channels.DONE_ADD_ENVELOPE);
});

ipcMain.on(channels.ADD_CATEGORY, async (event, { name }) => {
  console.log(channels.ADD_CATEGORY, name);

  await db('category')
    .insert({ category: name })
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });

  event.sender.send(channels.DONE_ADD_CATEGORY);
});

ipcMain.on(channels.DEL_CATEGORY, async (event, { id }) => {
  console.log(channels.DEL_CATEGORY, id);

  // Move any sub-envelopes to Uncategorized
  const uncategorizedID = await lookup_uncategorized();

  await db('envelope')
    .where('categoryID', id)
    .update('categoryID', uncategorizedID)
    .then(async () => {
      await db('category')
        .where({ id: id })
        .del()
        .then()
        .catch((err) => console.log('Error: ' + err));
    })
    .catch((err) => console.log('Error: ' + err));

  event.sender.send(channels.DONE_DEL_CATEGORY);
});

ipcMain.on(channels.DEL_ENVELOPE, async (event, { id }) => {
  console.log(channels.DEL_ENVELOPE, id);

  await db('envelope')
    .where({ id: id })
    .delete()
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });

  await db('transaction')
    .where({ envelopeID: id })
    .update({ envelopeID: -1 })
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });

  await db('keyword')
    .where({ envelopeID: id })
    .delete()
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });

  event.sender.send(channels.DONE_DEL_ENVELOPE);
});

ipcMain.on(channels.HIDE_ENVELOPE, async (event, { id }) => {
  console.log(channels.HIDE_ENVELOPE, id);

  await db('envelope')
    .where({ id: id })
    .update({ isActive: 0 })
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });

  event.sender.send(channels.DONE_HIDE_ENVELOPE);
});

ipcMain.on(channels.REN_CATEGORY, async (event, { id, name }) => {
  console.log(channels.REN_CATEGORY, id, name);

  await db('category')
    .where({ id: id })
    .update({ category: name })
    .then(() => {
      console.log('Renamed category: ' + name);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  event.sender.send(channels.DONE_REN_CATEGORY);
});

ipcMain.on(channels.REN_ENVELOPE, (event, { id, name }) => {
  console.log(channels.REN_ENVELOPE, id, name);

  db('envelope')
    .where({ id: id })
    .update({ envelope: name })
    .then(() => {
      console.log('Renamed envelope: ' + name);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.MOV_ENVELOPE, (event, { id, newCatID }) => {
  console.log(channels.MOV_ENVELOPE, id, newCatID);

  db('envelope')
    .where({ id: id })
    .update({ categoryID: newCatID })
    .then(() => {
      console.log('Moved envelope to: ' + newCatID);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(
  channels.COPY_BUDGET,
  async (event, { newtxDate, budget_values }) => {
    console.log(channels.COPY_BUDGET, newtxDate, budget_values);
    for (let item of budget_values) {
      await set_or_update_budget_item(item.envID, newtxDate, item.value);
    }
    event.sender.send(channels.DONE_COPY_BUDGET);
  }
);

ipcMain.on(
  channels.UPDATE_BUDGET,
  async (event, { newEnvelopeID, newtxDate, newtxAmt }) => {
    console.log(channels.UPDATE_BUDGET, newEnvelopeID, newtxDate, newtxAmt);
    await set_or_update_budget_item(newEnvelopeID, newtxDate, newtxAmt);
    event.sender.send(channels.DONE_UPDATE_BUDGET);
  }
);

async function set_or_update_budget_item(newEnvelopeID, newtxDate, newtxAmt) {
  return await db('transaction')
    .select('id', 'txAmt')
    .where('envelopeID', newEnvelopeID)
    .andWhere('txDate', newtxDate)
    .andWhere('isBudget', 1)
    .then(async function (rows) {
      if (rows.length === 0) {
        // no matching records found
        return await db('transaction')
          .insert({
            envelopeID: newEnvelopeID,
            txDate: newtxDate,
            isBudget: 1,
            txAmt: newtxAmt,
            isDuplicate: 0,
            isVisible: 1,
          })
          .then(async () => {
            await db.raw(
              `UPDATE 'envelope' SET balance = balance + ` +
                newtxAmt +
                ` WHERE id = ` +
                newEnvelopeID
            );
          })
          .catch((err) => {
            console.log('Error inserting budget: ' + err);
          });
      } else {
        // Already exist
        await db
          .raw(
            `UPDATE 'envelope' SET balance = balance + ` +
              (newtxAmt - rows[0].txAmt) +
              ` WHERE id = ` +
              newEnvelopeID
          )
          .then(async () => {
            await db('transaction')
              .update({ txAmt: newtxAmt })
              .where('id', rows[0].id)
              .then(() => {
                console.log('Updated budget amt.');
              })
              .catch((err) => {
                console.log('Error updating budget: ' + err);
              });
          })
          .catch((err) => {
            console.log('Error updating budget: ' + err);
          });
      }
    })
    .catch((err) => {
      console.log('Error checking if budget exists: ' + err);
    });
}

ipcMain.on(channels.UPDATE_BALANCE, (event, { id, newAmt }) => {
  console.log(channels.UPDATE_BALANCE, id, newAmt);

  db('envelope')
    .update({ balance: newAmt })
    .where({ id: id })
    .then()
    .catch((err) => {
      console.log('Error updating balance: ' + err);
    });
});

ipcMain.on(channels.MOVE_BALANCE, (event, { transferAmt, fromID, toID }) => {
  console.log(channels.MOVE_BALANCE, transferAmt, fromID, toID);

  db.raw(
    `update 'envelope' set balance = balance - ` +
      transferAmt +
      ` where id = ` +
      fromID
  ).then();

  db.raw(
    `update 'envelope' set balance = balance + ` +
      transferAmt +
      ` where id = ` +
      toID
  ).then();
});

ipcMain.on(channels.GET_CAT_ENV, (event, { onlyActive }) => {
  console.log(channels.GET_CAT_ENV);
  if (db) {
    let query = db
      .select(
        'category.id as catID',
        'category.category',
        'envelope.id as envID',
        'envelope.envelope',
        'envelope.balance as currBalance',
        'envelope.isActive'
      )
      .from('category')
      .leftJoin('envelope', function () {
        this.on('category.id', '=', 'envelope.categoryID');
      })
      .orderBy('category.id');

    if (onlyActive === 1) {
      query.where('envelope.isActive', 1);
    }

    query
      .then((data) => {
        event.sender.send(channels.LIST_CAT_ENV, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.GET_BUDGET_ENV, (event) => {
  console.log(channels.GET_BUDGET_ENV);
  if (db) {
    db.select(
      'category.id as catID',
      'category.category',
      'envelope.id as envID',
      'envelope.envelope',
      'envelope.balance as currBalance'
    )
      .from('envelope')
      .leftJoin('category', function () {
        this.on('category.id', '=', 'envelope.categoryID');
      })
      .where('envelope.isActive', 1)
      .orderBy('category.id')
      .then((data) => {
        event.sender.send(channels.LIST_BUDGET_ENV, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.GET_PREV_BUDGET, (event, { find_date }) => {
  console.log(channels.GET_PREV_BUDGET);
  db.select('envelopeID', 'txAmt')
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 1 })
    .andWhere({ txDate: find_date })
    .then((data) => {
      event.sender.send(channels.LIST_PREV_BUDGET, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_CUR_BUDGET, (event, { find_date }) => {
  console.log(channels.GET_CUR_BUDGET, find_date);
  db.select('envelopeID', 'txAmt')
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 1 })
    .andWhere({ txDate: find_date })
    .then((data) => {
      event.sender.send(channels.LIST_CUR_BUDGET, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_PREV_ACTUAL, (event, { find_date }) => {
  console.log(channels.GET_PREV_ACTUAL);

  const month = dayjs(new Date(find_date)).format('MM');
  const year = dayjs(new Date(find_date)).format('YYYY');

  db.select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`strftime('%m', txDate) = ?`, month)
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
    .andWhereRaw(`strftime('%Y', txDate) = ?`, year)
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_PREV_ACTUAL, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_CUR_ACTUAL, (event, { find_date }) => {
  console.log(channels.GET_CUR_ACTUAL);

  const month = dayjs(new Date(find_date)).format('MM');
  const year = dayjs(new Date(find_date)).format('YYYY');

  db.select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .from('transaction')
    .where({ isBudget: 0 })
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
    .andWhereRaw(`strftime('%Y', txDate) = ?`, year)
    .andWhereRaw(`strftime('%m', txDate) = ?`, month)
    .groupBy('envelopeID')
    .orderBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_CUR_ACTUAL, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_CURR_BALANCE, (event) => {
  console.log(channels.GET_CURR_BALANCE);

  db.select('id', 'balance')
    .from('envelope')
    .orderBy('id')
    .then((data) => {
      event.sender.send(channels.LIST_CURR_BALANCE, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_MONTHLY_AVG, (event, { find_date }) => {
  console.log(channels.GET_MONTHLY_AVG);

  db.select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .min({ firstDate: 'txDate' })
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`julianday(?) - julianday(txDate) < 365`, [find_date])
    .andWhereRaw(`julianday(?) - julianday(txDate) > 0`, [find_date])
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_MONTHLY_AVG, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(
  channels.GET_TX_DATA,
  (
    event,
    {
      filterStartDate,
      filterEndDate,
      filterCatID,
      filterEnvID,
      filterAccID,
      filterDesc,
      filterAmount,
    }
  ) => {
    console.log(
      channels.GET_TX_DATA,
      filterStartDate,
      filterEndDate,
      filterCatID,
      filterEnvID,
      filterAccID,
      filterDesc,
      filterAmount
    );

    if (db) {
      let query = db
        .select(
          'transaction.id as txID',
          'envelope.categoryID as catID',
          'transaction.envelopeID as envID',
          'category.category as category',
          'envelope.envelope as envelope',
          'transaction.accountID as accountID',
          'account.account as account',
          'transaction.txDate as txDate',
          'transaction.txAmt as txAmt',
          'transaction.description as description',
          'keyword.envelopeID as keywordEnvID',
          'transaction.isDuplicate as isDuplicate',
          'transaction.isVisible as isVisible',
          'transaction.isSplit as isSplit'
        )
        .from('transaction')
        .leftJoin('envelope', function () {
          this.on('envelope.id', '=', 'transaction.envelopeID');
        })
        .leftJoin('category', function () {
          this.on('category.id', '=', 'envelope.categoryID');
        })
        .leftJoin('account', function () {
          this.on('account.id', '=', 'transaction.accountID');
        })
        .leftJoin('keyword', function () {
          //this.on('keyword.description', '=', 'transaction.description');
          /*
          TODO: This is pulling in multiple instances on multiple keyword matches
          Right now that could happen on a keyword rename.
          Keyword insert is disabled if a keyword already matches.
          */
          this.on(
            'transaction.description',
            'like',
            'keyword.description'
          ).andOn(function () {
            this.onVal('keyword.account', '=', 'All').orOn(
              'keyword.account',
              'account.account'
            );
          });
        })
        .where({ isBudget: 0 })
        .orderBy('transaction.txDate', 'desc');

      if (parseInt(filterEnvID) > -2) {
        query = query.andWhere('transaction.envelopeID', filterEnvID);
      } else {
        if (parseInt(filterEnvID) > -3) {
          query = query.andWhere(function () {
            this.where('transaction.envelopeID', -1).orWhere(
              'envelope.isActive',
              0
            );
          });
        }
      }
      if (parseInt(filterCatID) > -1) {
        query = query.andWhere('envelope.categoryID', filterCatID);
      }
      if (filterAccID !== -1 && filterAccID !== '-1' && filterAccID !== 'All') {
        query = query.andWhere('account.account', filterAccID);
      }
      if (filterDesc?.length) {
        filterDesc = '%' + filterDesc + '%';
        query = query.andWhereRaw(
          `'transaction'.description LIKE ?`,
          filterDesc
        );
      }
      if (filterStartDate) {
        query = query.andWhereRaw(`'transaction'.txDate >= ?`, filterStartDate);
      }
      if (filterEndDate) {
        query = query.andWhereRaw(`'transaction'.txDate <= ?`, filterEndDate);
      }
      if (filterAmount?.length) {
        query = query.andWhereRaw(
          `'transaction'.txAmt = ?`,
          parseFloat(filterAmount)
        );
      }

      query
        .then((data) => {
          event.sender.send(channels.LIST_TX_DATA, data);
        })
        .catch((err) => console.log(err));
    }
  }
);

ipcMain.on(
  channels.EXPORT_TX,
  async (
    event,
    {
      filterStartDate,
      filterEndDate,
      filterCatID,
      filterEnvID,
      filterAccID,
      filterDesc,
      filterAmount,
    }
  ) => {
    console.log(
      channels.EXPORT_TX,
      filterStartDate,
      filterEndDate,
      filterCatID,
      filterEnvID,
      filterAccID,
      filterDesc,
      filterAmount
    );

    if (db) {
      let query = db
        .select(
          'transaction.id as txID',
          'envelope.categoryID as catID',
          'transaction.envelopeID as envID',
          'category.category as category',
          'envelope.envelope as envelope',
          'transaction.accountID as accountID',
          'account.account as account',
          'transaction.txDate as txDate',
          'transaction.txAmt as txAmt',
          'transaction.description as description',
          'keyword.envelopeID as keywordEnvID',
          'transaction.isDuplicate as isDuplicate',
          'transaction.isVisible as isVisible',
          'transaction.isSplit as isSplit'
        )
        .from('transaction')
        .leftJoin('envelope', function () {
          this.on('envelope.id', '=', 'transaction.envelopeID');
        })
        .leftJoin('category', function () {
          this.on('category.id', '=', 'envelope.categoryID');
        })
        .leftJoin('account', function () {
          this.on('account.id', '=', 'transaction.accountID');
        })
        .leftJoin('keyword', function () {
          //this.on('keyword.description', '=', 'transaction.description');
          /*
          TODO: This is pulling in multiple instances on multiple keyword matches
          Right now that could happen on a keyword rename.
          Keyword insert is disabled if a keyword already matches.
          */
          this.on(
            'transaction.description',
            'like',
            'keyword.description'
          ).andOn(function () {
            this.onVal('keyword.account', '=', 'All').orOn(
              'keyword.account',
              'account.account'
            );
          });
        })
        .where({ isBudget: 0 })
        .orderBy('transaction.txDate', 'desc');

      if (parseInt(filterEnvID) > -2) {
        query = query.andWhere('transaction.envelopeID', filterEnvID);
      } else {
        if (parseInt(filterEnvID) > -3) {
          query = query.andWhere(function () {
            this.where('transaction.envelopeID', -1).orWhere(
              'envelope.isActive',
              0
            );
          });
        }
      }
      if (parseInt(filterCatID) > -1) {
        query = query.andWhere('envelope.categoryID', filterCatID);
      }
      if (filterAccID !== -1 && filterAccID !== '-1' && filterAccID !== 'All') {
        query = query.andWhere('account.account', filterAccID);
      }
      if (filterDesc?.length) {
        filterDesc = '%' + filterDesc + '%';
        query = query.andWhereRaw(
          `'transaction'.description LIKE ?`,
          filterDesc
        );
      }
      if (filterStartDate) {
        query = query.andWhereRaw(`'transaction'.txDate >= ?`, filterStartDate);
      }
      if (filterEndDate) {
        query = query.andWhereRaw(`'transaction'.txDate <= ?`, filterEndDate);
      }
      if (filterAmount?.length) {
        query = query.andWhereRaw(
          `'transaction'.txAmt = ?`,
          parseFloat(filterAmount)
        );
      }

      await query
        .then(async (data) => {
          const { filePath } = await dialog.showSaveDialog({
            title: 'Export CSV File',
            filters: [{ name: 'CSV File', extensions: ['csv'] }],
          });

          if (filePath) {
            let total_records = data?.length;
            let writer = fs.createWriteStream(filePath);

            // Write the headers
            writer.write('Date,');
            writer.write('Account,');
            writer.write('Description,');
            writer.write('Amount,');
            writer.write('Category : Envelope,');
            writer.write('isSplit,');
            writer.write('isDuplicate,');
            writer.write('isVisible');
            writer.write('\n');

            data.forEach((item, i) => {
              // Write the content
              writer.write(item.txDate + ',');
              writer.write(item.account + ',');
              writer.write(item.description + ',');
              writer.write(item.txAmt.toString() + ',');
              writer.write(item.category + ' : ' + item.envelope + ',');
              writer.write(item.isSplit.toString() + ',');
              writer.write(item.isDuplicate.toString() + ',');
              writer.write(item.isVisible.toString());
              writer.write('\n');
              event.sender.send(
                channels.EXPORT_PROGRESS,
                (i * 100) / total_records
              );
            });
            event.sender.send(channels.EXPORT_PROGRESS, 100);
          }
        })
        .catch((err) => console.log(err));

      event.sender.send(channels.EXPORT_PROGRESS, 100);
    }
  }
);

ipcMain.on(channels.ADD_TX, async (event, { data }) => {
  console.log(channels.ADD_TX);

  // Prepare the data node
  const myNode = {
    envelopeID: data.txEnvID,
    txAmt: data.txAmt,
    txDate: data.txDate,
    description: data.txDesc,
    refNumber: '',
    isBudget: 0,
    origTxID: 0,
    isDuplicate: 0,
    isSplit: 0,
    accountID: data.txAccID,
    isVisible: 1,
  };

  // Insert the node
  await db('transaction').insert(myNode);

  // Update the envelope balance
  await update_env_balance(data.txEnvID, data.txAmt);

  event.sender.send(channels.DONE_ADD_TX);
});

ipcMain.on(channels.GET_ENV_LIST, (event, { onlyActive }) => {
  console.log(channels.GET_ENV_LIST);

  if (db) {
    let query = db
      .select(
        'envelope.id as envID',
        'category.category as category',
        'envelope.envelope as envelope'
      )
      .from('envelope')
      .leftJoin('category', function () {
        this.on('category.id', '=', 'envelope.categoryID');
      })
      .orderBy('category.category', 'envelope.envelope');

    if (onlyActive === 1) {
      query.where('envelope.isActive', 1);
    }

    query
      .then((data) => {
        event.sender.send(channels.LIST_ENV_LIST, data);
      })
      .catch((err) => console.log(err));
  }
});

async function update_tx_env(txID, envID) {
  await db
    .select('id', 'txAmt', 'envelopeID')
    .from('transaction')
    .where({ id: txID })
    .then(async (rows) => {
      if (rows?.length) {
        if (rows[0].envelopeID > 0) {
          await db
            .raw(
              `update 'envelope' set balance = balance - ` +
                rows[0].txAmt +
                ` where id = ` +
                rows[0].envelopeID
            )
            .then()
            .catch((err) => {
              console.log('Error: ' + err);
            });
        }

        await db
          .raw(
            `update 'envelope' set balance = balance + ` +
              rows[0].txAmt +
              ` where id = ` +
              envID
          )
          .then()
          .catch((err) => {
            console.log('Error: ' + err);
          });
      }
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  await db('transaction')
    .where({ id: txID })
    .update({ envelopeID: envID })
    .then(() => {
      console.log('Changed tx envelope to: ' + envID);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
}

ipcMain.on(channels.UPDATE_TX_ENV, async (event, { txID, envID }) => {
  console.log(channels.UPDATE_TX_ENV, txID, envID);
  await update_tx_env(txID, envID);
  event.sender.send(channels.DONE_UPDATE_TX_ENV);
});

ipcMain.on(channels.UPDATE_TX_DESC, async (event, { txID, new_value }) => {
  console.log(channels.UPDATE_TX_DESC, txID, new_value);

  db('transaction')
    .where({ id: txID })
    .update({ description: new_value })
    .then()
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.SAVE_KEYWORD, (event, { acc, envID, description }) => {
  console.log(channels.SAVE_KEYWORD, acc, envID, description);

  db.from('keyword')
    .delete()
    .where({ description: description })
    .then(() => {
      const node = {
        account: acc,
        envelopeID: envID,
        description: description,
      };

      db('keyword')
        .insert(node)
        .then()
        .catch((err) => {
          console.log('Error: ' + err);
        });
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

async function adjust_balance(txID, add_or_remove) {
  await db
    .select('envelopeID', 'txAmt')
    .from('transaction')
    .where({ id: txID })
    .then(async (data) => {
      if (data?.length) {
        await update_env_balance(
          data[0].envelopeID,
          add_or_remove === 'add' ? data[0].txAmt : -1 * data[0].txAmt
        );
      }
    });
}

ipcMain.on(channels.SET_DUPLICATE, async (event, { txID, isDuplicate }) => {
  console.log(channels.SET_DUPLICATE, txID, isDuplicate);

  await db('transaction')
    .update({ isDuplicate: isDuplicate })
    .where({ id: txID })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  // Need to adjust envelope balance
  await adjust_balance(txID, isDuplicate ? 'rem' : 'add');

  event.sender.send(channels.DONE_SET_DUPLICATE);
});

ipcMain.on(channels.SET_VISIBILITY, async (event, { txID, isVisible }) => {
  console.log(channels.SET_VISIBILITY, txID, isVisible);

  await db('transaction')
    .update({ isVisible: isVisible })
    .where({ id: txID })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  // Need to adjust envelope balance
  await adjust_balance(txID, isVisible ? 'add' : 'rem');

  event.sender.send(channels.DONE_SET_VISIBILITY);
});

async function lookup_account(account) {
  let accountID = -1;

  // Lookup if we've already use this one
  if (account?.length) {
    await db
      .select('id', 'account', 'refNumber')
      .from('account')
      .orderBy('account')
      .where({ refNumber: account })
      .then(async (data) => {
        if (data?.length) {
          // If we have, use this ID
          accountID = data[0].id;
        } else {
          // If we haven't, lets store this one
          await db('account')
            .insert({ account: 'New Account', refNumber: account, isActive: 1 })
            .then((result) => {
              if (result?.length) {
                accountID = result[0];
              }
            })
            .catch((err) => {
              console.log('Error: ' + err);
            });
        }
      })
      .catch((err) => console.log(err));
  }

  return accountID;
}

async function lookup_plaid_account(account) {
  let accountID = -1;

  // Lookup if we've already use this one
  if (account?.length) {
    await db
      .select('id', 'account', 'refNumber')
      .from('account')
      .orderBy('account')
      .where({ plaid_id: account })
      .then(async (data) => {
        if (data?.length) {
          // If we have, use this ID
          accountID = data[0].id;
        } else {
          // If we haven't, lets store this one
          await db('account')
            .insert({
              account: 'New Account',
              refNumber: account,
              plaid_id: account,
              isActive: 1,
            })
            .then((result) => {
              if (result?.length) {
                accountID = result[0];
              }
            })
            .catch((err) => {
              console.log('Error: ' + err);
            });
        }
      })
      .catch((err) => console.log(err));
  }

  return accountID;
}

async function lookup_envelope(envelope, defaultCategoryID) {
  let envelopeID = -1;

  // Lookup if we've already use this one
  if (envelope?.length) {
    await db
      .select('id', 'envelope')
      .from('envelope')
      .orderBy('id')
      .where({ envelope: envelope })
      .then(async (data) => {
        if (data?.length) {
          // If we have, use this ID
          envelopeID = data[0].id;
        } else {
          // If we haven't, lets store this one
          await db('envelope')
            .insert({
              envelope: envelope,
              categoryID: defaultCategoryID,
              balance: 0,
              isActive: 1,
            })
            .then((result) => {
              if (result?.length) {
                envelopeID = result[0];
              }
            })
            .catch((err) => {
              console.log('Error: ' + err);
            });
        }
      })
      .catch((err) => console.log(err));
  }

  return envelopeID;
}

async function lookup_uncategorized() {
  let categoryID = -1;

  await db
    .select('id')
    .from('category')
    .where('category', 'Uncategorized')
    .then((rows) => {
      if (rows?.length > 0) {
        console.log('Uncategorized category ID is: ', rows[0].id);
        categoryID = rows[0].id;
      }
    })
    .catch((err) => console.log(err));

  return categoryID;
}

async function lookup_keyword(accountID, description) {
  let envID = -1;

  if (description?.length) {
    let query = db('keyword')
      .select('envelopeID')
      .whereRaw(`? LIKE description`, description);

    query = query.andWhere(function () {
      this.where('account', 'All').orWhere({
        account: db('account').select('account').where('id', accountID),
      });
    });

    await query.then((data) => {
      if (data?.length) {
        envID = data[0].envelopeID;
      }
    });
  }
  return envID;
}

async function lookup_if_duplicate(
  accountID,
  refNumber,
  txDate,
  txAmt,
  description
) {
  let isDuplicate = 0;

  // Check if it is a duplicate?
  if (refNumber?.length) {
    //console.log('Checking by refNumber');

    await db('transaction')
      .select('id')
      .andWhereRaw(`accountID = ?`, accountID)
      .andWhereRaw(`refNumber = ?`, refNumber)
      .andWhereRaw(`julianday(?) - julianday(txDate) = 0`, txDate)
      .then((data) => {
        if (data?.length) {
          isDuplicate = 1;
        }
      });
  } else {
    //console.log('Checking by other stuff');
    await db('transaction')
      .select('id')
      .where({ txAmt: txAmt })
      .andWhereRaw(`accountID = ?`, accountID)
      .andWhere({ description: description })
      .andWhereRaw(`julianday(?) - julianday(txDate) = 0`, txDate)
      .then((data) => {
        if (data?.length) {
          isDuplicate = 1;
        }
      });
  }

  return isDuplicate;
}

async function update_env_balance(envID, amt) {
  await db
    .raw(
      `UPDATE 'envelope' SET balance = balance + ` +
        amt +
        ` WHERE id = ` +
        envID
    )
    .then();
}

ipcMain.on(channels.IMPORT_OFX, async (event, { ofxString }) => {
  //console.log(channels.IMPORT_OFX, ofxString);

  let accountID = '';
  let accountID_str = '';
  let ver = '';

  // Find the financial institution ID
  const tmpStr = ofxString;
  if (tmpStr.includes('<ACCTID>')) {
    const i = tmpStr.indexOf('<ACCTID>') + 8;
    const j = tmpStr.indexOf('\n', i);
    const k = tmpStr.indexOf('</ACCTID>', i);

    accountID_str = tmpStr
      .substr(i, ((j < k && j !== -1) || k === -1 ? j : k) - i)
      .trim();
  }
  accountID = await lookup_account(accountID_str);

  // What version of OFX is this?
  // Seems like the OFX library only supports 102,
  //  maybe all the 100's.
  const tmpStr2 = ofxString;
  if (tmpStr2.includes('VERSION')) {
    const i = tmpStr.indexOf('VERSION') + 7;
    const j = tmpStr.indexOf('SECURITY', i);
    ver = tmpStr
      .substr(i, j - i)
      .replace(/"/g, '')
      .replace(/:/g, '')
      .replace(/=/g, '')
      .trim();
  }

  if (ver[0] === '1') {
    const ofx = new Ofx(ofxString);
    const trans = await ofx.getBankTransferList();
    let total_records = trans.length;

    trans.forEach(async (tx, i) => {
      insert_transaction_node(
        accountID,
        tx.TRNAMT,
        tx.DTPOSTED.date,
        tx.NAME,
        tx.FITID
      );
      event.sender.send(channels.UPLOAD_PROGRESS, (i * 100) / total_records);
    });
  }
  if (ver[0] === '2') {
    const xml = new XMLParser().parse(ofxString);
    const trans = await xml.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS
      .BANKTRANLIST.STMTTRN;
    let total_records = trans.length;

    trans.forEach(async (tx, i) => {
      insert_transaction_node(
        accountID,
        tx.TRNAMT,
        tx.DTPOSTED.substr(0, 4) +
          '-' +
          tx.DTPOSTED.substr(4, 2) +
          '-' +
          tx.DTPOSTED.substr(6, 2),
        tx.NAME,
        tx.FITID
      );
      event.sender.send(channels.UPLOAD_PROGRESS, (i * 100) / total_records);
    });
  }
  event.sender.send(channels.UPLOAD_PROGRESS, 100);
});

ipcMain.on(
  channels.IMPORT_CSV,
  async (event, { account_string, ofxString }) => {
    let accountID = '';
    let totalNodes = 0;

    // Find the financial institution ID
    console.log('Account string: ', account_string);

    const nodes = ofxString.split('\n');

    if (account_string.toLowerCase().startsWith('sofi-')) {
      accountID = await lookup_account(account_string);
      totalNodes = nodes.length;
      for (const [i, tx] of nodes.entries()) {
        if (i > 0 && tx.trim().length > 0) {
          const tx_values = tx.split(',');

          await insert_transaction_node(
            accountID,
            tx_values[3],
            tx_values[0],
            tx_values[1],
            ''
          );
          event.sender.send(channels.UPLOAD_PROGRESS, (i * 100) / totalNodes);
        }
      }
    }
    if (account_string.toLowerCase() === 'venmo') {
      accountID = await lookup_account(account_string);
      totalNodes = nodes.length;
      for (const [i, tx] of nodes.entries()) {
        if (i > 3 && tx[0] === ',') {
          const tx_values = tx.split(',');

          if (tx_values?.length && tx_values[1]?.length) {
            let refNumber = tx_values[1];
            let txDate = tx_values[2].substr(0, 10);
            let description = tx_values[5];
            let j = 5;
            if (description[0] === '"') {
              while (!tx_values[j].endsWith('"')) {
                j++;
                description += ',' + tx_values[j];
              }
              description = description.replace(/\"/g, '');
            }
            let txFrom = tx_values[j + 1];
            let txTo = tx_values[j + 2];
            let txAmt_str = tx_values[j + 3]
              .replace(/\"/g, '')
              .replace(/\+/g, '')
              .replace(/\$/g, '')
              .replace(/\ /g, '')
              .trim();
            let txAmt = parseFloat(txAmt_str);

            description = (txAmt > 0 ? txFrom : txTo) + ' : ' + description;

            insert_transaction_node(
              accountID,
              txAmt,
              txDate,
              description,
              refNumber
            );
            event.sender.send(channels.UPLOAD_PROGRESS, (i * 100) / totalNodes);
          }
        }
      }
    }
    if (account_string.toLowerCase() === 'paypal') {
      accountID = await lookup_account(account_string);
      totalNodes = nodes.length;
      for (const [i, tx] of nodes.entries()) {
        if (i > 0) {
          const tx_values = tx.split(',');

          if (tx_values?.length) {
            let j = 0;
            let item_iter = 0;
            let txDate = '';
            let description = '';
            let description2 = '';
            let txAmt = '';
            let refNum = '';
            while (j < tx_values?.length) {
              let item_str = tx_values[j];
              if (item_str[0] === '"') {
                while (j < tx_values?.length - 1 && !item_str.endsWith('"')) {
                  j++;
                  item_str += ',' + tx_values[j];
                }
                item_str = item_str.replace(/\"/g, '');
              }

              switch (item_iter) {
                case 0:
                  txDate = item_str.trim();
                  break;
                case 3:
                  description = item_str.trim();
                  break;
                case 4:
                  description2 = item_str.trim();
                  break;
                case 7:
                  txAmt = item_str.trim().replace(/,/g, '');
                  break;
                case 12:
                  refNum = item_str.trim();
                  break;
                default:
              }

              j++;
              item_iter++;
            }

            if (!description?.length && description2?.length) {
              description = description2;
            }

            await insert_transaction_node(
              accountID,
              txAmt,
              txDate,
              description,
              refNum
            );
            event.sender.send(channels.UPLOAD_PROGRESS, (i * 100) / totalNodes);
          }
        }
      }
    }
    if (account_string.toLowerCase() === 'mint') {
      const accountArr = [];
      const envelopeArr = [];
      const uncategorizedID = await lookup_uncategorized();

      totalNodes = nodes.length;
      for (const [i, tx] of nodes.entries()) {
        if (tx?.length) {
          const tx_values = tx.split(',');

          if (tx_values?.length) {
            // Date
            let txDate = dayjs(
              new Date(tx_values[0].replace(/\"/g, '').trim())
            ).format('YYYY-MM-DD');

            if (txDate !== 'Invalid date') {
              // Description
              let j = 1;
              let description = tx_values[j];
              if (description?.startsWith('"')) {
                while (!tx_values[j]?.endsWith('"')) {
                  j++;
                  description += ',' + tx_values[j];
                }
                description = description.replace(/\"/g, '');
              }

              // Original Description
              // We don't do anything with this, but need to account
              // for commas.
              j += 1;
              if (tx_values[j]?.startsWith('"')) {
                while (!tx_values[j]?.endsWith('"')) {
                  j++;
                }
              }

              // Amount
              j += 1;
              let txAmt = tx_values[j];
              if (txAmt?.startsWith('"')) {
                while (!tx_values[j]?.endsWith('"')) {
                  j++;
                  txAmt += tx_values[j];
                }
                txAmt = parseFloat(txAmt.replace(/\"/g, ''));
              }

              // Transaction type (debit or credit)
              j += 1;
              if (tx_values[j] && tx_values[j].replace(/\"/g, '') === 'debit') {
                txAmt = txAmt * -1;
              }

              // Category/envelope
              j += 1;
              let envelope_str = tx_values[j];
              if (envelope_str?.startsWith('"')) {
                while (!tx_values[j]?.endsWith('"')) {
                  j++;
                  envelope_str += ',' + tx_values[j];
                }
                envelope_str = envelope_str.replace(/\"/g, '').trim();
              }
              let envelopeID = '';
              if (envelopeArr?.length) {
                const found = envelopeArr.find((e) => e.name === envelope_str);
                if (found) {
                  envelopeID = found.id;
                } else {
                  envelopeID = await lookup_envelope(
                    envelope_str,
                    uncategorizedID
                  );
                  envelopeArr.push({ name: envelope_str, id: envelopeID });
                }
              } else {
                envelopeID = await lookup_envelope(
                  envelope_str,
                  uncategorizedID
                );
                envelopeArr.push({ name: envelope_str, id: envelopeID });
              }

              // Account
              j += 1;
              let account_str = tx_values[j];
              if (account_str?.startsWith('"')) {
                while (!tx_values[j]?.endsWith('"')) {
                  j++;
                  account_str += ',' + tx_values[j];
                }
                account_str = account_str.replace(/\"/g, '').trim();
              }
              let accountID = '';
              if (accountArr?.length) {
                const found = accountArr.find((e) => e.name === account_str);
                if (found) {
                  accountID = found.id;
                } else {
                  accountID = await lookup_account(account_str);
                  accountArr.push({ name: account_str, id: accountID });
                }
              } else {
                accountID = await lookup_account(account_str);
                accountArr.push({ name: account_str, id: accountID });
              }

              await basic_insert_transaction_node(
                accountID,
                txAmt,
                txDate,
                description,
                '',
                envelopeID
              );
            }
            event.sender.send(channels.UPLOAD_PROGRESS, (i * 100) / totalNodes);
          }
        }
      }
    }
    if (account_string.toLowerCase() === 'mint tab') {
      const accountArr = [];

      for (const [i, tx] of nodes.entries()) {
        const tx_values = tx.trim().split('\t');

        if (tx?.length && tx_values?.length) {
          let envID = tx_values[0].trim();
          let txAmt = tx_values[1].trim();
          let txDate = tx_values[2].trim();
          let description = tx_values[3].trim();
          let account_str = tx_values[4].trim();

          let accountID = '';
          if (accountArr?.length) {
            const found = accountArr.find((e) => e.name === account_str);
            if (found) {
              accountID = found.id;
            } else {
              accountID = await lookup_account(account_str);
              accountArr.push({ name: account_str, id: accountID });
            }
          } else {
            accountID = await lookup_account(account_str);
            accountArr.push({ name: account_str, id: accountID });
          }

          await basic_insert_transaction_node(
            accountID,
            txAmt,
            txDate,
            description,
            '',
            envID
          );
        }
      }
      console.log('');
    }
    event.sender.send(channels.UPLOAD_PROGRESS, 100);
  }
);

async function basic_insert_transaction_node(
  accountID,
  txAmt,
  txDate,
  description,
  refNumber,
  envID
) {
  let my_txDate = dayjs(new Date(txDate + 'T00:00:00')).format('YYYY-MM-DD');

  // Prepare the data node
  const myNode = {
    envelopeID: envID,
    txAmt: txAmt,
    txDate: my_txDate,
    description: description,
    refNumber: refNumber,
    isBudget: 0,
    origTxID: 0,
    isDuplicate: 0,
    isSplit: 0,
    accountID: accountID,
    isVisible: 1,
  };

  // Insert the node
  await db('transaction').insert(myNode);

  // Update the envelope balance
  if (envID !== -1) {
    await update_env_balance(envID, txAmt);
  }

  process.stdout.write('.');
}

async function remove_transaction(txID) {
  await db
    .select('id', 'envelopeID', 'txAmt', 'isDuplicate', 'isVisible')
    .from('transaction')
    .where({ id: txID })
    .then(async (data) => {
      if (data?.length) {
        await db('transaction').delete().where({ id: data[0].id });
        if (data[0].isVisible && !data[0].isDuplicate) {
          await update_env_balance(data[0].envelopeID, -1 * data[0].txAmt);
        }
      }
    })
    .catch((err) => console.log(err));
}

async function basic_remove_transaction_node(access_token, refNumber) {
  db.select(
    'transaction.id as id',
    'transaction.envelopeID as envelopeID',
    'transaction.txAmt as txAmt'
  )
    .from('plaid_account')
    .join('account', 'account.plaid_id', 'plaid_account.account_id')
    .join('transaction', 'transaction.account_id', 'account.id')
    .where({ access_token: access_token })
    .andWhere('transaction.refNumber', '=', refNumber)
    .then(async (data) => {
      if (data?.length) {
        await db('transaction').delete().where({ id: data[0].id });
        await update_env_balance(data[0].envelopeID, -1 * data[0].txAmt);
      }
    })
    .catch((err) => console.log(err));

  process.stdout.write('.');
}

//console.log(channels.IMPORT_OFX, ofxString);
async function insert_transaction_node(
  accountID,
  txAmt,
  txDate,
  description,
  refNumber
) {
  let isDuplicate = 0;

  let my_txDate = dayjs(new Date(txDate + 'T00:00:00')).format('YYYY-MM-DD');
  if (my_txDate === 'Invalid Date') {
    return;
  }
  if (txAmt === null || txAmt === '') {
    return;
  }

  // Check if this matches a keyword
  let envID = await lookup_keyword(accountID, description);

  // Check if this is a duplicate
  isDuplicate = await lookup_if_duplicate(
    accountID,
    refNumber,
    my_txDate,
    txAmt,
    description
  );

  // Prepare the data node
  const myNode = {
    envelopeID: envID,
    txAmt: txAmt,
    txDate: my_txDate,
    description: description,
    refNumber: refNumber,
    isBudget: 0,
    origTxID: 0,
    isDuplicate: isDuplicate,
    isSplit: 0,
    accountID: accountID,
    isVisible: 1,
  };

  // Insert the node
  await db('transaction').insert(myNode);

  // Update the envelope balance
  if (envID !== -1 && isDuplicate !== 1) {
    await update_env_balance(envID, txAmt);
  }
}

ipcMain.on(channels.GET_KEYWORDS, (event) => {
  console.log(channels.GET_KEYWORDS);
  if (db) {
    db.select(
      'keyword.id',
      'keyword.envelopeID',
      'description',
      'category',
      'envelope',
      'account'
    )
      .from('keyword')
      .leftJoin('envelope', function () {
        this.on('keyword.envelopeID', '=', 'envelope.id');
      })
      .leftJoin('category', function () {
        this.on('category.id', '=', 'envelope.categoryID');
      })
      .then((data) => {
        event.sender.send(channels.LIST_KEYWORDS, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.GET_ACCOUNT_NAMES, (event) => {
  console.log(channels.GET_ACCOUNT_NAMES);
  if (db) {
    db.select('account')
      .from('account')
      .orderBy('account')
      .groupBy('account')
      .then((data) => {
        event.sender.send(channels.LIST_ACCOUNT_NAMES, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.GET_ACCOUNTS, (event) => {
  console.log(channels.GET_ACCOUNTS);
  if (db) {
    db.select('account.id', 'account.refNumber', 'account', 'isActive')
      .max({ lastTx: 'txDate' })
      .count({ numTx: 'txDate' })
      .from('account')
      .leftJoin('transaction', function () {
        this.on('account.id', '=', 'transaction.accountID')
          .on('transaction.isBudget', '=', 0)
          .on('transaction.isVisible', '=', 1)
          .on('transaction.isDuplicate', '=', 0);
      })
      .orderBy('account.id')
      .groupBy('account.id', 'account.refNumber', 'account', 'isActive')
      .then((data) => {
        event.sender.send(channels.LIST_ACCOUNTS, data);
      })
      .catch((err) => console.log(err));
  }
});

ipcMain.on(channels.UPDATE_KEYWORD_ENV, (event, { id, new_value }) => {
  console.log(channels.GET_KEYWORDS, { id, new_value });
  db('keyword')
    .update({ envelopeID: new_value })
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.UPDATE_KEYWORD_ACC, (event, { id, new_value }) => {
  console.log(channels.UPDATE_KEYWORD_ACC, { id, new_value });
  db('keyword')
    .update({ account: new_value })
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.SET_ALL_KEYWORD, (event, { id, force }) => {
  console.log(channels.SET_ALL_KEYWORD, { id });

  db.select('envelopeID', 'description', 'account')
    .from('keyword')
    .where({ id: id })
    .then((data) => {
      let query = db('transaction')
        .update({ envelopeID: data[0].envelopeID })
        .whereRaw(`description LIKE ?`, data[0].description);

      if (data[0].account !== 'All') {
        query = query.andWhere({
          accountID: db('account')
            .select('id')
            .where('account', data[0].account),
        });
      }

      if (force === 0) {
        query = query.andWhere({ envelopeID: -1 });
      }
      query.then();
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.DEL_KEYWORD, async (event, { id }) => {
  console.log(channels.DEL_KEYWORD, { id });

  await db('keyword')
    .delete()
    .where({ id: id })
    .catch((err) => console.log(err));

  event.sender.send(channels.DONE_DEL_KEYWORD);
});

ipcMain.on(channels.UPDATE_KEYWORD, (event, { id, new_value }) => {
  console.log(channels.UPDATE_KEYWORD, { id, new_value });
  db('keyword')
    .update({ description: new_value })
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.UPDATE_ACCOUNT, (event, { id, new_value }) => {
  console.log(channels.UPDATE_ACCOUNT, { id, new_value });
  db('account')
    .update({ account: new_value })
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.VIS_ACCOUNT, async (event, { id, value }) => {
  console.log(channels.VIS_ACCOUNT, { id, value });
  await db('account')
    .update({ isActive: value })
    .where({ id: id })
    .catch((err) => console.log(err));

  event.sender.send(channels.DONE_VIS_ACCOUNT);
});

ipcMain.on(channels.DEL_ACCOUNT, async (event, { id }) => {
  console.log(channels.DEL_ACCOUNT, { id });
  await db('account')
    .delete()
    .where({ id: id })
    .catch((err) => console.log(err));

  event.sender.send(channels.DONE_DEL_ACCOUNT);
});

ipcMain.on(
  channels.GET_ENV_CHART_DATA,
  (event, { filterEnvID, filterTimeFrameID }) => {
    console.log(channels.GET_ENV_CHART_DATA, filterEnvID);

    const find_date = dayjs(new Date()).format('YYYY-MM-DD');

    const filterType = filterEnvID.substr(0, 3);
    const envID = filterEnvID.substr(3);

    let query = db('transaction')
      .select({
        month: db.raw(`strftime("%Y/%m", txDate)`),
        isBudget: 'isBudget',
      })
      .sum({ totalAmt: 'txAmt' })
      .where({ isDuplicate: 0 })
      .andWhere({ isVisible: 1 })
      .andWhereRaw(`julianday(?) - julianday(txDate) < ?`, [
        find_date,
        365 * filterTimeFrameID,
      ])
      .andWhereRaw(`julianday(?) - julianday(txDate) > 0`, [find_date])
      .groupBy('month', 'isBudget')
      .orderBy('month');

    if (filterType === 'env' && parseInt(envID) > -2) {
      query = query.where('envelopeID', envID);
    }

    if (filterType === 'env' && parseInt(envID) === -2) {
      query = query
        .leftJoin('envelope', function () {
          this.on('envelope.id', '=', 'transaction.envelopeID');
        })
        .leftJoin('category', function () {
          this.on('category.id', '=', 'envelope.categoryID');
        })
        .andWhereNot({ category: 'Income' });
    }

    if (filterType === 'cat') {
      query = query
        .leftJoin('envelope', function () {
          this.on('envelope.id', '=', 'transaction.envelopeID');
        })
        .leftJoin('category', function () {
          this.on('category.id', '=', 'envelope.categoryID');
        })
        .andWhere({ categoryID: envID });
    }

    query
      .then((data) => {
        event.sender.send(channels.LIST_ENV_CHART_DATA, data);
      })
      .catch((err) => console.log(err));
  }
);

const get_db_ver = async () => {
  //console.log('get_db_ver');
  let ver = null;
  if (db) {
    await db('version')
      .select('version')
      .then((data) => {
        ver = data[0].version;
      })
      .catch((err) => {
        console.log('Error getting DB version.');
      });
  }
  //console.log('returning version: ', ver);
  return ver;
};

ipcMain.on(channels.GET_DB_VER, async (event) => {
  console.log(channels.GET_DB_VER);
  const ver = await get_db_ver();
  //console.log('got version: ', ver);
  event.sender.send(channels.LIST_DB_VER, {
    version: ver,
    latest: latest_DB_version,
  });
});

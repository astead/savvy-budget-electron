const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev'); // To check if electron is in development mode
const path = require('path');
const knex = require('./db/db.js');
const { channels } = require('../src/shared/constants');
const Moment = require('moment');
const { BankTransferList, Ofx } = require('ofx-convert');

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Savvy Budget',
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

  win.webContents.openDevTools();
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
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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
process.on('uncaughtException', (error) => {
  console.log(`Exception: ${error}`);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on(channels.ADD_ENVELOPE, (event, { categoryID }) => {
  console.log(channels.ADD_ENVELOPE, categoryID);

  knex('envelope')
    .insert({
      categoryID: categoryID,
      envelope: 'New Envelope',
      balance: 0,
      isActive: 1,
    })
    .then(() => {
      console.log('Added envelope ');
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.ADD_CATEGORY, (event, name) => {
  console.log(channels.ADD_CATEGORY, name);

  knex('category')
    .insert({ category: name })
    .then(() => {
      console.log('Added category: ' + name);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.DEL_CATEGORY, (event, id) => {
  console.log(channels.DEL_CATEGORY, id);

  // Move any sub-envelopes to Uncategorized
  knex
    .select('category.id as catID')
    .from('category')
    .where('category', 'Uncategorized')
    .then((rows) => {
      if (rows.length > 0) {
        const uncategorizedID = rows[0].catID;
        knex('envelope')
          .where('categoryID', id)
          .update('categoryID', uncategorizedID)
          .catch((err) => {
            console.log('Error: ' + err);
          });
      }
    })
    .catch((err) => console.log(err));

  // TODO: Maybe if we hit an error above,
  //  we shouldn't continue
  knex('category')
    .where({ id: id })
    .del()
    .then(() => {
      console.log('Deleted category: ' + id);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.DEL_ENVELOPE, (event, id) => {
  console.log(channels.DEL_ENVELOPE, id);

  knex('envelope')
    .where({ id: id })
    .update({ isActive: 0 })
    .then(() => {
      console.log('Deleted envelope: ' + id);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.REN_CATEGORY, (event, { id, name }) => {
  console.log(channels.REN_CATEGORY, id, name);

  knex('category')
    .where({ id: id })
    .update({ category: name })
    .then(() => {
      console.log('Renamed category: ' + name);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.REN_ENVELOPE, (event, { id, name }) => {
  console.log(channels.REN_ENVELOPE, id, name);

  knex('envelope')
    .where({ id: id })
    .update({ envelope: name })
    .then(() => {
      console.log('Renamed envelope: ' + name);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.MOV_ENVELOPE, (event, [id, newCatID]) => {
  console.log(channels.MOV_ENVELOPE, id, newCatID);

  knex('envelope')
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
  channels.UPDATE_BUDGET,
  (event, [newEnvelopeID, newtxDate, newtxAmt]) => {
    console.log(channels.UPDATE_BUDGET, newEnvelopeID, newtxDate, newtxAmt);

    return knex('transaction')
      .select('id', 'txAmt')
      .where('envelopeID', newEnvelopeID)
      .andWhere('txDate', newtxDate)
      .andWhere('isBudget', 1)
      .then(function (rows) {
        if (rows.length === 0) {
          console.log('no budget entries');

          // no matching records found
          return knex('transaction')
            .insert({
              envelopeID: newEnvelopeID,
              txDate: newtxDate,
              isBudget: 1,
              txAmt: newtxAmt,
            })
            .then(() => {
              knex('envelope')
                .update(knex.raw(`balance = balance + ` + newtxAmt))
                .where('id', newEnvelopeID);
            })
            .catch((err) => {
              console.log('Error inserting budget: ' + err);
            });
        } else {
          // Already exist
          knex
            .raw(
              `update 'envelope' set balance = balance + ` +
                (newtxAmt - rows[0].txAmt) +
                ` where id = ` +
                newEnvelopeID
            )
            .then(() => {
              knex('transaction')
                .update({ txAmt: newtxAmt })
                .where('envelopeID', newEnvelopeID)
                .andWhere('txDate', newtxDate)
                .andWhere('isBudget', 1)
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
);

ipcMain.on(channels.GET_CAT_ENV, (event) => {
  console.log(channels.GET_CAT_ENV);
  knex
    .select(
      'category.id as catID',
      'category.category',
      'envelope.id as envID',
      'envelope.envelope',
      'envelope.balance as currBalance'
    )
    .from('category')
    .leftJoin('envelope', function () {
      this.on('category.id', '=', 'envelope.categoryID');
      this.on('envelope.isActive', 1);
    })
    .orderBy('category.id')
    .then((data) => {
      event.sender.send(channels.LIST_CAT_ENV, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_BUDGET_ENV, (event) => {
  console.log(channels.GET_BUDGET_ENV);
  knex
    .select(
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
});

ipcMain.on(channels.GET_PREV_BUDGET, (event, find_date) => {
  console.log(channels.GET_PREV_BUDGET);
  knex
    .select('envelopeID', 'txAmt')
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 1 })
    .andWhere({ txDate: find_date })
    .then((data) => {
      event.sender.send(channels.LIST_PREV_BUDGET, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_CUR_BUDGET, (event, find_date) => {
  console.log(channels.GET_CUR_BUDGET);
  knex
    .select('envelopeID', 'txAmt')
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 1 })
    .andWhere({ txDate: find_date })
    .then((data) => {
      event.sender.send(channels.LIST_CUR_BUDGET, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_PREV_ACTUAL, (event, find_date) => {
  console.log(channels.GET_PREV_ACTUAL);

  const month = Moment(new Date(find_date)).format('MM');
  const year = Moment(new Date(find_date)).format('YYYY');

  knex
    .select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`strftime('%m', txDate) = ?`, month)
    .where({ isDuplicate: 0 })
    .andWhereRaw(`strftime('%Y', txDate) = ?`, year)
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_PREV_ACTUAL, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_CUR_ACTUAL, (event, find_date) => {
  console.log(channels.GET_CUR_ACTUAL);

  const month = Moment(new Date(find_date)).format('MM');
  const year = Moment(new Date(find_date)).format('YYYY');

  knex
    .select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`strftime('%m', txDate) = ?`, month)
    .where({ isDuplicate: 0 })
    .andWhereRaw(`strftime('%Y', txDate) = ?`, year)
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_CUR_ACTUAL, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_CURR_BALANCE, (event) => {
  console.log(channels.GET_CURR_BALANCE);

  knex
    .select('id', 'balance')
    .from('envelope')
    .orderBy('id')
    .then((data) => {
      event.sender.send(channels.LIST_CURR_BALANCE, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_MONTHLY_AVG, (event, find_date) => {
  console.log(channels.GET_MONTHLY_AVG);

  knex
    .select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .min({ firstDate: 'txDate' })
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`julianday(?) - julianday(txDate) < 365`, [find_date])
    .where({ isDuplicate: 0 })
    .andWhereRaw(`julianday(?) - julianday(txDate) > 0`, [find_date])
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_MONTHLY_AVG, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_TX_DATA, (event, find_date) => {
  console.log(channels.GET_TX_DATA);

  const month = Moment(new Date(find_date)).format('MM');
  const year = Moment(new Date(find_date)).format('YYYY');

  knex
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
      'transaction.isDuplicate as isDuplicate'
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
      this.on('keyword.description', '=', 'transaction.description');
    })
    .where({ isBudget: 0 })
    .andWhereRaw(`strftime('%m', txDate) = ?`, month)
    .andWhereRaw(`strftime('%Y', txDate) = ?`, year)
    .orderBy('transaction.txDate')
    .then((data) => {
      event.sender.send(channels.LIST_TX_DATA, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.ADD_TX, (event, data) => {
  console.log(channels.ADD_TX);

  data.map((d) => {
    const node = {
      envelopeID: d[0],
      txAmt: d[1],
      txDate: d[2],
      description: d[3],
      refNumber: 0,
      isBudget: 0,
      isTransfer: 0,
      isDuplicate: 0,
      isSplit: 0,
      accountID: 0,
    };

    knex('transaction')
      .insert(node)
      .then()
      .catch((err) => {
        console.log('Error: ' + err);
      });
  });
});

ipcMain.on(channels.GET_ENV_LIST, (event) => {
  console.log(channels.GET_ENV_LIST);
  knex
    .select(
      'envelope.id as envID',
      'category.category as category',
      'envelope.envelope as envelope'
    )
    .from('envelope')
    .leftJoin('category', function () {
      this.on('category.id', '=', 'envelope.categoryID');
      this.on('envelope.isActive', 1);
    })
    .orderBy('category.category', 'envelope.envelope')
    .then((data) => {
      event.sender.send(channels.LIST_ENV_LIST, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.UPDATE_TX_ENV, (event, [txID, envID]) => {
  console.log(channels.UPDATE_TX_ENV, txID, envID);

  knex
    .select('id', 'txAmt')
    .from('transaction')
    .where({ id: txID })
    .then((rows) => {
      if (rows?.length) {
        knex
          .raw(
            `update 'envelope' set balance = balance - ` +
              rows[0].txAmt +
              ` where id = ` +
              rows[0].envelopeID
          )
          .then(() => {
            knex.raw(
              `update 'envelope' set balance = balance + ` +
                rows[0].txAmt +
                ` where id = ` +
                envID
            );
          })
          .catch((err) => {
            console.log('Error: ' + err);
          });
      }
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  knex('transaction')
    .where({ id: txID })
    .update({ envelopeID: envID })
    .then(() => {
      console.log('Changed tx envelope to: ' + envID);
    })
    .catch((err) => {
      console.log('Error: ' + err);
    });
});

ipcMain.on(channels.SAVE_KEYWORD, (event, [envID, description]) => {
  console.log(channels.SAVE_KEYWORD, envID, description);

  knex
    .from('keyword')
    .delete()
    .where({ description: description })
    .then(() => {
      const node = {
        envelopeID: envID,
        description: description,
      };

      knex('keyword')
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

ipcMain.on(channels.IMPORT_OFX, async (event, ofxString) => {
  console.log(channels.IMPORT_OFX, ofxString);

  let accountID = '';

  const tmpStr = ofxString;
  // Find the financial institution ID
  if (tmpStr.includes('<ACCTID>')) {
    const i = tmpStr.indexOf('<ACCTID>') + 8;
    const j = tmpStr.indexOf('\n', i);
    accountID = tmpStr.substr(i, j - i).trim();
    console.log('Account ID: ', accountID);
  }

  // Lookup if we've already use this one
  if (accountID.length) {
    await knex
      .select('id', 'account', 'refNumber')
      .from('account')
      .orderBy('account')
      .where({ refNumber: accountID })
      .then(async (data) => {
        console.log('looking up account, found: ', data?.length);
        if (data?.length) {
          // If we have, use this ID
          accountID = data[0].id;
          console.log(data[0].id, ' -> accountID = ', accountID);
        } else {
          // If we haven't, lets store this one
          await knex('account')
            .insert({ account: 'New Account', refNumber: accountID })
            .then((result) => {
              if (result?.length) {
                accountID = result[0];
                console.log(result[0], ' -> accountID = ', accountID);
              }
            })
            .catch((err) => {
              console.log('Error: ' + err);
            });
        }
      })
      .catch((err) => console.log(err));
  }

  console.log('Final account ID: ', accountID);

  const ofx = new Ofx(ofxString);
  const trans = await ofx.getBankTransferList();

  trans.map(async (tx, i) => {
    let envID = -1;
    let isDuplicate = 0;
    let txDate = Moment(new Date(tx.DTPOSTED.date)).format('YYYY-MM-DD');

    // Check if this matches a keyword
    if (tx.MEMO?.length) {
      await knex('keyword')
        .select('envelopeID')
        .where({ description: tx.NAME })
        .then((data) => {
          if (data?.length) {
            envID = data[0].envelopeID;
          }
        });
    }

    // TODO: Check if it is a duplicate?
    if (tx.FITID?.length) {
      await knex('transaction')
        .select('id')
        .where({ refNumber: tx.FITID })
        .andWhereRaw(`julianday(?) - julianday(txDate) = 0`, txDate)
        .then((data) => {
          if (data?.length) {
            isDuplicate = 1;
          }
        });
    }

    // Prepare the data node
    const myNode = {
      envelopeID: envID,
      txAmt: tx.TRNAMT,
      txDate: txDate,
      description: tx.NAME,
      refNumber: tx.FITID,
      isBudget: 0,
      isTransfer: 0,
      isDuplicate: isDuplicate,
      isSplit: 0,
      accountID: accountID,
    };

    // Insert the node
    knex('transaction')
      .insert(myNode)
      .then((result) => {
        if (result?.length) {
          process.stdout.write('.');
        }
      });

    // TODO: Update the envelope balance
  });
});

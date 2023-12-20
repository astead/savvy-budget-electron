const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev'); // To check if electron is in development mode
const path = require('path');
const knex = require('./db/db.js');
const { channels } = require('../src/shared/constants');
const Moment = require('moment');
const { BankTransferList, Ofx } = require('ofx-convert');
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser');

/*
  TODO:
  - consolidate redundant work?
*/

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
  // However what if there are no sub-envelopes.
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

  // TODO: What to do with orphaned transactions
  // Maybe set them to -1?
  // Or don't show inactive envelopes in budget AND
  //    have a way to show those at the end of the budget
  //    and allow setting to those envelopes in other stuff.
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
      .then(async function (rows) {
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
            .then(async () => {
              await knex.raw(
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
          await knex
            .raw(
              `UPDATE 'envelope' SET balance = balance + ` +
                (newtxAmt - rows[0].txAmt) +
                ` WHERE id = ` +
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
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
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
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
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
    .andWhereRaw(`julianday(?) - julianday(txDate) > 0`, [find_date])
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_MONTHLY_AVG, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_TX_DATA, (event, [find_date, filterEnvID]) => {
  console.log(channels.GET_TX_DATA, find_date, filterEnvID);

  const month = Moment(new Date(find_date)).format('MM');
  const year = Moment(new Date(find_date)).format('YYYY');

  let query = knex
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
      'transaction.isVisible as isVisible'
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
    .orderBy('transaction.txDate');

  if (filterEnvID > -2) {
    query = query.andWhere('transaction.envelopeID', filterEnvID);
  } else {
    if (filterEnvID > -3) {
      query = query.andWhere(function () {
        this.where('transaction.envelopeID', -1).orWhere(
          'envelope.isActive',
          0
        );
      });
    }
  }

  query
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
      isVisible: 1,
    };

    knex('transaction')
      .insert(node)
      .then()
      .catch((err) => {
        console.log('Error: ' + err);
      });
  });
});

ipcMain.on(channels.GET_ENV_LIST, (event, { includeInactive }) => {
  console.log(channels.GET_ENV_LIST);

  let query = knex
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

  if (includeInactive === 0) {
    query.where('envelope.isActive', 1);
  }

  query
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

function adjust_balance(txID, add_or_remove) {
  knex
    .select('envelopeID', 'txAmt')
    .from('transaction')
    .where({ id: txID })
    .then((data) => {
      if (data?.length) {
        update_env_balance(
          data[0].id,
          add_or_remove === 'add' ? data[0].txAmt : -1 * data[0].txAmt
        );
      }
    });
}

ipcMain.on(channels.SET_DUPLICATE, (event, [txID, isDuplicate]) => {
  console.log(channels.SET_DUPLICATE, txID, isDuplicate);

  knex('transaction')
    .update({ isDuplicate: isDuplicate })
    .where({ id: txID })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  // Need to adjust envelope balance
  adjust_balance(txID, isDuplicate ? 'rem' : 'add');
});

ipcMain.on(channels.SET_VISIBILITY, (event, [txID, isVisible]) => {
  console.log(channels.SET_VISIBILITY, txID, isVisible);

  knex('transaction')
    .update({ isVisible: isVisible })
    .where({ id: txID })
    .catch((err) => {
      console.log('Error: ' + err);
    });

  // Need to adjust envelope balance
  adjust_balance(txID, isVisible ? 'add' : 'rem');
});

async function lookup_account(account) {
  let accountID = -1;

  // Lookup if we've already use this one
  if (account?.length) {
    await knex
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
          await knex('account')
            .insert({ account: 'New Account', refNumber: account })
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

async function lookup_keyword(description) {
  let envID = -1;

  if (description?.length) {
    await knex('keyword')
      .select('envelopeID')
      .where({ description: description })
      .then((data) => {
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

    await knex('transaction')
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
    await knex('transaction')
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
  await knex.raw(
    `UPDATE 'envelope' SET balance = balance + ` + amt + ` WHERE id = ` + envID
  );
}

ipcMain.on(channels.IMPORT_OFX, async (event, ofxString) => {
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

    trans.map(async (tx, i) => {
      insert_transaction_node(
        accountID,
        tx.TRNAMT,
        tx.DTPOSTED.date,
        tx.NAME,
        tx.FITID
      );
    });
  }
  if (ver[0] === '2') {
    const xml = new XMLParser().parse(ofxString);
    const trans = await xml.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS
      .BANKTRANLIST.STMTTRN;

    trans.map(async (tx, i) => {
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
    });
  }
  process.stdout.write('\n');
});

ipcMain.on(channels.IMPORT_CSV, async (event, [account_string, ofxString]) => {
  let accountID = '';

  // Find the financial institution ID
  console.log('Account string: ', account_string);
  accountID = await lookup_account(account_string);

  const nodes = ofxString.split('\n');

  if (account_string.startsWith('sofi-')) {
    nodes.map(async (tx, i) => {
      if (i > 0) {
        const tx_values = tx.split(',');

        insert_transaction_node(
          accountID,
          tx_values[3],
          tx_values[0],
          tx_values[1],
          ''
        );
      }
    });
  }
  if (account_string === 'Venmo') {
    nodes.map(async (tx, i) => {
      if (i > 3 && tx[0] === ',') {
        const tx_values = tx.split(',');

        if (tx_values?.length) {
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
          description =
            (txFrom !== 'Alan Stead' ? txFrom : txTo) + ' : ' + description;

          let txAmt = tx_values[j + 3]
            .replace(/\"/g, '')
            .replace(/\+/g, '')
            .replace(/\$/g, '')
            .replace(/\ /g, '')
            .trim();

          insert_transaction_node(
            accountID,
            txAmt,
            txDate,
            description,
            refNumber
          );
        }
      }
    });
  }
  if (account_string === 'PayPal') {
    nodes.map(async (tx, i) => {
      if (i > 0) {
        const tx_values = tx.split(',');

        if (tx_values?.length) {
          let txDate = Moment(
            new Date(tx_values[0].replace(/\"/g, '').trim())
          ).format('YYYY-MM-DD');

          let description = tx_values[3].replace(/\"/g, '').trim();
          let description2 = tx_values[4].replace(/\"/g, '').trim();
          if (!description?.length && description2?.length) {
            description = description2;
          }

          let j = 7;
          let txAmt = tx_values[7];
          if (txAmt.startsWith('"')) {
            while (!tx_values[j].endsWith('"')) {
              j++;
              txAmt += tx_values[j];
            }
            txAmt = txAmt.replace(/\"/g, '');
          }

          await insert_transaction_node(
            accountID,
            txAmt,
            txDate,
            description,
            ''
          );
        }
      }
    });
  }
  if (account_string === 'Mint') {
    nodes.map(async (tx, i) => {
      if (i > 0) {
        const tx_values = tx.split(',');

        if (tx_values?.length) {
          let txDate = Moment(
            new Date(tx_values[0].replace(/\"/g, '').trim())
          ).format('YYYY-MM-DD');

          let j = 1;
          let description = tx_values[j];
          if (description[0] === '"') {
            while (!tx_values[j].endsWith('"')) {
              j++;
              description += ',' + tx_values[j];
            }
            description = description.replace(/\"/g, '');
          }

          j += 2;
          let txAmt = tx_values[j];
          if (txAmt.startsWith('"')) {
            while (!tx_values[j].endsWith('"')) {
              j++;
              txAmt += tx_values[j];
            }
            txAmt = parseFloat(txAmt.replace(/\"/g, ''));
          }

          j += 1;
          if (tx_values[j] === 'debit') {
            txAmt = txAmt * -1;
          }

          j += 1;
          //let category = tx_values[j];

          j += 1;
          let account_str = tx_values[j];
          accountID = await lookup_account(account_str);

          //let refNumber = tx_values[j + 5].replace(/\"/g, '').trim();

          await basic_insert_transaction_node(
            accountID,
            txAmt,
            txDate,
            description,
            '',
            -1
          );
        }
      }
    });
  }
});

async function basic_insert_transaction_node(
  accountID,
  txAmt,
  txDate,
  description,
  refNumber,
  envID
) {
  let my_txDate = Moment(new Date(txDate)).format('YYYY-MM-DD');

  // Prepare the data node
  const myNode = {
    envelopeID: envID,
    txAmt: txAmt,
    txDate: my_txDate,
    description: description,
    refNumber: refNumber,
    isBudget: 0,
    isTransfer: 0,
    isDuplicate: 0,
    isSplit: 0,
    accountID: accountID,
    isVisible: 1,
  };

  // Insert the node
  await knex('transaction').insert(myNode);

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
  let envID = -1;
  let isDuplicate = 0;
  let my_txDate = Moment(new Date(txDate)).format('YYYY-MM-DD');

  // Check if this matches a keyword
  envID = await lookup_keyword(description);

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
    isTransfer: 0,
    isDuplicate: isDuplicate,
    isSplit: 0,
    accountID: accountID,
    isVisible: 1,
  };

  // Insert the node
  await knex('transaction').insert(myNode);

  // Update the envelope balance
  if (envID !== -1 && isDuplicate !== 1) {
    await update_env_balance(envID, txAmt);
  }

  process.stdout.write('.');
}

ipcMain.on(channels.GET_KEYWORDS, (event) => {
  console.log(channels.GET_KEYWORDS);
  knex
    .select('id', 'envelopeID', 'description')
    .from('keyword')
    .orderBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_KEYWORDS, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_ACCOUNTS, (event) => {
  console.log(channels.GET_ACCOUNTS);
  knex
    .select('id', 'refNumber', 'account')
    .from('account')
    .orderBy('id')
    .then((data) => {
      event.sender.send(channels.LIST_ACCOUNTS, data);
    })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.UPDATE_KEYWORD_ENV, (event, { id, new_value }) => {
  console.log(channels.GET_KEYWORDS, { id, new_value });
  knex('keyword')
    .update({ envelopeID: new_value })
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.DEL_KEYWORD, (event, { id }) => {
  console.log(channels.DEL_KEYWORD, { id });
  knex('keyword')
    .delete()
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.UPDATE_ACCOUNT, (event, { id, new_value }) => {
  console.log(channels.UPDATE_ACCOUNT, { id, new_value });
  knex('account')
    .update({ account: new_value })
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.DEL_ACCOUNT, (event, { id }) => {
  console.log(channels.DEL_ACCOUNT, { id });
  knex('account')
    .delete()
    .where({ id: id })
    .catch((err) => console.log(err));
});

ipcMain.on(channels.GET_ENV_CHART_DATA, (event, filterEnvID) => {
  console.log(channels.GET_ENV_CHART_DATA, filterEnvID);

  const find_date = Moment(new Date()).format('YYYY-MM-DD');

  let query = knex('transaction')
    .select({ month: knex.raw(`strftime("%m", txDate)`) })
    .sum({ totalAmt: 'txAmt' })
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`julianday(?) - julianday(txDate) < 365`, [find_date])
    .andWhereRaw(`julianday(?) - julianday(txDate) > 0`, [find_date])
    .andWhere({ isDuplicate: 0 })
    .andWhere({ isVisible: 1 })
    .groupBy('month');

  if (filterEnvID > -2) {
    query.where('envelopeID', filterEnvID);
  }

  query
    .then((data) => {
      event.sender.send(channels.LIST_ENV_CHART_DATA, data);
    })
    .catch((err) => console.log(err));
});

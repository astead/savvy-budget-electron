const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev'); // To check if electron is in development mode
const path = require('path');
const knex = require('./db/db.js');
const { channels } = require('../src/shared/constants');

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
    .insert({ categoryID: categoryID, envelope: 'New Envelope', balance: 0 })
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
    .del()
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
    .from('envelope')
    .leftJoin('category', function () {
      this.on('category.id', '=', 'envelope.categoryID');
    })
    .orderBy('category.id')
    .then((data) => {
      event.sender.send(channels.LIST_CAT_ENV, data);
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
      event.sender.send(channels.LIST_PREV_ACTUAL, data);
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

  const month = new Date(find_date).getMonth();
  const year = new Date(find_date).getFullYear();

  knex
    .select('envelopeID')
    .sum({ totalAmt: 'txAmt' })
    .from('transaction')
    .orderBy('envelopeID')
    .where({ isBudget: 0 })
    .andWhereRaw(`strftime('%m', txDate) = ?`, [month])
    .where({ isDuplicate: 0 })
    .andWhereRaw(`strftime('%Y', txDate) = ?`, [year])
    .groupBy('envelopeID')
    .then((data) => {
      event.sender.send(channels.LIST_MONTHLY_AVG, data);
    })
    .catch((err) => console.log(err));
});

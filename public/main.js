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
    .insert({ categoryID: categoryID, envelope: 'New Envelope' })
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

ipcMain.on(channels.GET_CAT_ENV, (event) => {
  console.log(channels.GET_CAT_ENV);
  knex
    .select(
      'category.id as catID',
      'category.category',
      'envelope.id as envID',
      'envelope.envelope'
    )
    .from('category')
    .leftJoin('envelope', function () {
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
    .where({ txDate: find_date })
    .then((data) => {
      event.sender.send(channels.LIST_PREV_BUDGET, data);
    })
    .catch((err) => console.log(err));
});

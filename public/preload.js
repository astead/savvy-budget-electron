//preload.js

const { ipcRenderer, contextBridge } = require('electron');

const os = require('os');

contextBridge.exposeInMainWorld('electron', {
  homeDir: () => os.homedir(),
  osVersion: () => os.version(),
  arch: () => os.arch(),
});

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

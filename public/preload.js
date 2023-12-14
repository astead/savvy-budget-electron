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
  on: (channel, func) => {
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  require: (callback) => window.require(callback),
});

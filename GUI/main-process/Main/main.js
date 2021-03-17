const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const config = require('../../config/config');
const automator = require('../Automator/automator');
const loginWindow = require('../Login/login');
const workflowWindow = require('../Workflow/workflow');

class Main {
  constructor() { this.window; }

  init() {
    this.window = new BrowserWindow({
      icon: config.ICON_PATH,
      width: 1100,
      opacity: 1,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        sandbox: false
      }
    });
    this.window.setIcon(config.ICON_PATH);
    // Load html in window
    this.window.loadURL(url.format({
      pathname: path.join(__dirname, '../../components', 'Main', 'main.html'),
      protocol: 'file:',
      slashes:true
    }));

    // open sign in if secret not provided
    if(!config.SECRET) {
      this.showLogin();
    } else if(config.ACTIVE) {
      automator.run();
    }
  
    // Quit app when closed
    this.window.on('closed', function() {
      automator.kill();
      app.quit();
    });
  }

  setOpacity(value) {
    this.window.setOpacity(value);
  }

  getWindow() {
    return this.window;
  }

  showLogin() {
    loginWindow.init(this.window);
  }
};

ipcMain.on('folder:open', function(e, path) {
  shell.showItemInFolder(path);
});

// Catch files:add
ipcMain.on('files:add', function() {
  // open file select dialog
  dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
  .then(result => {
    if(!result.canceled) {
      for(let i = 0; i < result.filePaths.length; i++) {
        // File destination.txt will be created or overwritten by default.
        fs.copyFile(result.filePaths[0], "C:\\Documents\\" + result.filePaths[0].replace(/^.*[\\\/]/, ''), (err) => {
          if (err) throw err;
        });
      }
    }
  })
});

module.exports = new Main();

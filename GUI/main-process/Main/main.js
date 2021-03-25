const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const config = require('../../config/config');
const automator = require('../Automator/automator');
const loginWindow = require('../Login/login');
const workflowWindow = require('../Workflow/workflow');

class Main {
  constructor() {
    this.window;
    this.initialized;
  }

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
      slashes: true
    }));

    // Quit app when closed
    this.window.on('closed', function () {
      automator.kill();
      app.quit();
    });

    // handle evets
    let _this = this;

    ipcMain.on('online-status-changed', (event, status) => {
      console.log(status);
      if (!_this.initialized && status == 'online') {
        _this.initialized = true;
        // open sign in if secret not provided
        if (!config.SECRET)
          _this.showLogin();
        else
          automator.run();
      }
    });

    ipcMain.on('workflows:update', function () {
      _this.updateWorkflows();
    });

    ipcMain.on('workflow:delete', function (e, dirPath) {
      let options = {
        buttons: ["Yes", "No"],
        message: "Do you really want to delete this workflow?"
      };
      dialog.showMessageBox(_this.window, options).then(result => {
        if (result.response === 0) {
          _this.deleteWorkflow(dirPath);
        }
      });
    });
  }

  deleteWorkflow(dirPath) {
    config.deleteWorkflowItem(dirPath);
    fs.rmdirSync(dirPath, { recursive: true });
    this.updateWorkflows();
  }

  setOpacity(value) {
    this.window.setOpacity(value);
  }

  updateWorkflows() {
    this.window.webContents.send('update-workflows', config.getWorkflows());
  }

  getWindow() {
    return this.window;
  }

  showLogin() {
    loginWindow.init(this.window);
  }
};

ipcMain.on('folder:open', function (e, dirPath) {
  shell.showItemInFolder(dirPath);
});

ipcMain.on('files:select', function (e, rootDir) {
  // open file select dialog
  dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    .then(result => {
      if (!result.canceled) {
        copyFilesToConverterDir(result.filePaths, rootDir)
      }
    })
});

ipcMain.on('files:add', function (e, data) {
  copyFilesToConverterDir(data.filePaths, data.rootDir)
});

function copyFilesToConverterDir(filePaths, rootDir) {
  console.log(filePaths);
  console.log(rootDir);
  for (let i = 0; i < filePaths.length; i++) {
    fs.copyFile(filePaths[i], path.join(rootDir, filePaths[i].replace(/^.*[\\\/]/, '')), (err) => {
      if (err) throw err;
    });
  }
}

module.exports = new Main();

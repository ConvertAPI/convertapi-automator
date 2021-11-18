const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const config = require('../../config/config');
const automator = require('../Automator/automator');
const loginWindow = require('../Login/login');
const workflowWindow = require('../Workflow/workflow');
const log = require('electron-log');
const apiService = require('../../services/api-service.ts');

class Main {
  constructor() {
    this.window;
    this.initialized;
  }

  init() {
    this.window = new BrowserWindow({
      icon: config.ICON_PATH,
      width: 1100,
      height:700,
      opacity: 1,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        sandbox: false
      }
    });
    this.window.maximize();
    this.window.show();
    this.window.setIcon(config.ICON_PATH);
    // Load html in window
    this.window.loadURL(url.format({
      pathname: path.join(__dirname, '../../components', 'Main', 'main.html'),
      protocol: 'file:',
      slashes: true
    }));
    workflowWindow.setParentWindow(this.window);
    
    // handle evets
    let _this = this;

    ipcMain.on('online-status:change', (event, status) => {
      if (!_this.initialized && status == 'online') {
        _this.initialized = true;
        // open sign in if secret not provided
        if (!config.SECRET)
          _this.showLogin();
        else
          automator.run(this.window);
      }
    });

    ipcMain.on('workflows:request-update', function () {
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

    // check user balance periodically
    this.updateUserData();
    setInterval(() => {
      _this.updateUserData();
    }, 1000*60);

    return this.window;
  }

  updateUserData() {
    apiService.getUserInfo(config.getSecret()).then(userData => {
      this.window.webContents.send('user:update', userData);
    })
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
    this.window.webContents.send('workflows:update', config.getWorkflows());
  }

  toggleConsole(show) {
    this.window.webContents.send('console:toggle', show);
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
  for (let i = 0; i < filePaths.length; i++) {
    fs.copyFile(filePaths[i], path.join(rootDir, filePaths[i].replace(/^.*[\\\/]/, '')), (err) => {
      if (err)
        log.error(err);
    });
  }
}

module.exports = new Main();

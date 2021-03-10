const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const automator = require('../Automator/automator');

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
};


module.exports = new Main();

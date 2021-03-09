const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const automator = require('../Automator/automator');

let main = {};

main.init = () => {
    main.window = new BrowserWindow({
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
      main.window.setIcon(config.ICON_PATH);
      // Load html in window
      main.window.loadURL(url.format({
        pathname: path.join(__dirname, '../../components', 'Main', 'main.html'),
        protocol: 'file:',
        slashes:true
      }));
    
      // Quit app when closed
      main.window.on('closed', function() {
        automator.kill();
        app.quit();
      });
}

ipcMain.on('secret:add', function(e, secretKey) {
    main.window.setOpacity(1);
});

ipcMain.on('mainWindow:blur', () => {
    main.window.setOpacity(0.8);
});

module.exports = main;

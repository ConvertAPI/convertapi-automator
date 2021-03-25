const { BrowserWindow, ipcMain } = require('electron');
const AutoLaunch = require('auto-launch');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const automator = require('../Automator/automator');
const mainWindow = require('../Main/main');

let settings = {};

let autoLauncher = new AutoLaunch({
    name: "ConvertAPI workflows"
});

settings.init = () => {
    createSettingsWindow();
}

function createSettingsWindow() {
    settings.window = new BrowserWindow({
      icon: config.ICON_PATH,
      width: 600,
      height:300,
      title:'ConvertAPI Settings',
      frame: true,
      modal: true,
      resizable: false,
      parent: mainWindow.getWindow(),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    settings.window.setMenuBarVisibility(false);
    settings.window.loadURL(url.format({
      pathname: path.join(__dirname, '../../components', 'Settings', 'settings.html'),
      protocol: 'file:',
      slashes:true
    }));
    // Handle garbage collection
    settings.window.on('close', function(){
        settings.window = null;
    });
  }
  
  ipcMain.on('settings:open', function(){
    createSettingsWindow();
  });
  
ipcMain.on('settings:save', (e, data) => {
    // save settings to config.json
    config.saveSettings(data.secret, data.active, data.concurrency, data.autolaunch);
    if(!data.active)
        automator.kill();
    else {
        automator.run();
    }
    //close window
    settings.window.close();
    settings.window = null;
});

ipcMain.on('autolaunch:enable', function() {
    // Checking if autoLaunch is enabled, if not then enable it.
    autoLauncher.isEnabled().then(function(isEnabled) {
        if (isEnabled) return;
        autoLauncher.enable();
    }).catch(function (err) {
        throw err;
    });
});


module.exports = settings;
const { BrowserWindow, ipcMain, app } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const automator = require('../Automator/automator');
const mainWindow = require('../Main/main');
const log = require('electron-log');

let settings = {};

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

ipcMain.handle('settings:get', async (e) => {
  return { secret: config.SECRET, active: config.ACTIVE, concurrency: config.CONCURRENCY, autolaunch: config.START_ON_BOOT };
});

  ipcMain.on('settings:open', function(){
    createSettingsWindow();
  });
  
ipcMain.on('settings:save', (e, data) => {
  if(config.START_ON_BOOT != data.autolaunch)
  {
      app.setLoginItemSettings({
        openAtLogin: data.autolaunch,
        path:process.execPath,
        args: [
          '--processStart', config.AUTOMATOR_PATH,
          'process-start-args', automator.getParameters()
        ]
      });
  }
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

module.exports = settings;
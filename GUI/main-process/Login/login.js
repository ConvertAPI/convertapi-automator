const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const Automator = require('../Automator/automator');

let login = {};

login.init = () => {
    createSecretWindow();
}

function createSecretWindow() {
  login.window = new BrowserWindow({
    width: 350,
    height:250,
    title:'Sign In',
    frame: false,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });
  login.window.loadURL(url.format({
    pathname: path.join(__dirname, '../../components', 'Login', 'login.html'),
    protocol: 'file:',
    slashes:true
  }));
  // Handle garbage collection
  login.window.on('close', function(){
    login.window = null;
  });
}

// Catch secret:add
ipcMain.on('secret:add', function(e, secretKey) {
  //store secret 
  config.saveSettings(secretKey);
  // run exe file
  Automator.run();
  login.window.close(); 
  login.window = null;
});

module.exports = login;
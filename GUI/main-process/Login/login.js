const { BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const Automator = require('../Automator/automator');
const mainWindow = require('../Main/main');

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
    parent: mainWindow.getWindow(),
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
  let request = net.request({
    url: 'https://v2.convertapi.com/user?Secret=' + secretKey
  });
  request.on('response', (response) => {
     if (response.statusCode == 200) {
      response.on('data', (chunk) => {
        let jsonData = JSON.parse(chunk);
        let secondsLeft = jsonData.SecondsLeft;
        if(secondsLeft > 0) {
          //store secret 
          config.saveSettings(secretKey);
          // run exe file
          Automator.run();
          mainWindow.setOpacity(1);
          login.window.close(); 
          login.window = null;
        } else {
          e.sender.send('validation-error', 'Please top up your account!'); 
          return false;
        }
      });
     }
     else {
       e.sender.send('validation-error', 'Authorization error - bad secret'); 
       return false;
    }
  });
  request.end()
});

module.exports = login;
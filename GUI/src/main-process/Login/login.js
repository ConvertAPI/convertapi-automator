const { BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const apiService = require('../../services/api-service.ts');
const Automator = require('../Automator/automator');

class Login {
  constructor() { 
    this.window;
  }

  init(mainWindow) {
    this.window = new BrowserWindow({
      width: 350,
      height:250,
      title:'Sign In',
      frame: false,
      modal: true,
      resizable: false,
      parent: mainWindow,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
    });
    this.window.loadURL(url.format({
      pathname: path.join(__dirname, '../../components', 'Login', 'login.html'),
      protocol: 'file:',
      slashes:true
    }));
    // Handle garbage collection
    this.window.on('close', function(){
      this.window = null;
    });
    this.handleSecret();
  }

  getWindow() {
    return this.window;
  }

  handleSecret() {
    let _this = this;
    // Catch secret:add
    ipcMain.on('secret:add', function(e, secretKey) {
      apiService.getUserInfo(secretKey).then(userData => {
        let secondsLeft = userData.SecondsLeft
        if(secondsLeft > 0) {
          //store secret 
          config.saveSettings(secretKey)
          // run exe file
          Automator.run()
          _this.window.close()
          _this.window = null
        } else {
          e.sender.send('validation:error', 'Please top up your account!')
          return false
        }
      }).catch(err => {
          e.sender.send('validation:error', 'Authorization error - bad secret')
          return false
      })
    })
  }
}

module.exports = new Login();
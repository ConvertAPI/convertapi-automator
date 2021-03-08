const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const child = require('child_process').execFile;

const AUTOMATOR_PATH = process.platform == 'win32' ? path.join(__dirname, 'executables', 'win', 'convertapi-automator.exe') 
                      : process.platform == 'darwin' ? path.join(__dirname, 'executables', 'mac', 'convertapi-automator_osx.tar') 
                      : path.join(__dirname, 'executables', 'linux', 'convertapi-automator_linux.tar');

let login = {};

login.show = () => {
  console.log('show login')
    createSecretWindow();
}

function createSecretWindow() {
    enterSecretWindow = new BrowserWindow({
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
    console.log(path.join(__dirname, '../../components', 'Login', 'login.html'));
    enterSecretWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../../components', 'Login', 'login.html'),
      protocol: 'file:',
      slashes:true
    }));
    // Handle garbage collection
    enterSecretWindow.on('close', function(){
      enterSecretWindow = null;
    });
  }

  // Catch secret:add
ipcMain.on('secret:add', function(e, secretKey) {
  // run exe file with params
  let level = 0;
  let concurrency = 5;
  let directories = "C:\\Documents\\";
  var parameters = ["--watch", `--secret=${secretKey}`, `--level=${level}`, `--concurrency=${concurrency}`, `--dir=${directories}`];
  automatorProcess = child(AUTOMATOR_PATH, parameters, {shell: true}, function(err, data) {
    console.log(err)
    console.log(data.toString());
  });
  mainWindow.webContents.send('blur:off');
  mainWindow.setOpacity(1);
  enterSecretWindow.close(); 
  enterSecretWindow = null;
  createTray();
});

  module.exports = login;
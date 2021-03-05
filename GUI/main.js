const electron = require('electron');
const path = require('path');
const url = require('url');

// SET ENV
process.env.NODE_ENV = 'development';

const child = require('child_process').execFile;
const {app, BrowserWindow, Menu, ipcMain, shell, dialog} = electron;

let mainWindow;
let enterSecretWindow;
let automatorProcess;
let secret;

// Listen for app to be ready
app.on('ready', function() {
  // Create new window
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'assets', 'icons', 'win', 'icon.ico'),
    width: 1100,
  });
  mainWindow.setIcon(path.join(__dirname, 'assets', 'icons', 'png', 'icon.png'));
  // Load html in window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'components', 'Main', 'main.html'),
    protocol: 'file:',
    slashes:true
  }));
  createSecretWindow();
  // Quit app when closed
  mainWindow.on('closed', function(){
    if(automatorProcess)
      automatorProcess.kill();
    app.quit();
  });

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

function createSecretWindow() {
  enterSecretWindow = new BrowserWindow({
    width: 350,
    height:250,
    title:'Sign In',
    frame: false,
    parent: mainWindow, 
    modal: true
  });
  enterSecretWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'components', 'Login', 'login.html'),
    protocol: 'file:',
    slashes:true
  }));
  // Handle garbage collection
  enterSecretWindow.on('close', function(){
    enterSecretWindow = null;
  });
  mainWindow.webContents.on('did-finish-load', function () {
    mainWindow.webContents.send('blur:on');
  });
}

// Catch secret:add
ipcMain.on('secret:add', function(e, secretKey){
    // run exe file with params
    let level = 0;
    let concurrency = 5;
    let directories = "C:\\Documents\\";
    var executablePath = "C:\\Users\\Kostelis\\Desktop\\Baltsoft\\convertapi-automator_win\\convertapi-automator.exe";
    var parameters = ["--watch", `--secret=${secretKey}`, `--level=${level}`, `--concurrency=${concurrency}`, `--dir=${directories}`];
    automatorProcess = child(executablePath, parameters, {shell: true}, function(err, data) {
      console.log(err)
      console.log(data.toString());
    });
    mainWindow.webContents.send('blur:off');
  enterSecretWindow.close(); 
  enterSecretWindow = null;
});

// Catch files:add
ipcMain.on('files:add', function(e, secretKey){
  // open file select dialog
  dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
  .then(result => {
    console.log(result.canceled)
    console.log(result.filePaths)
  })
});

// Create menu template
const mainMenuTemplate =  [
  // Each object is a dropdown
  {
    label: 'File',
    submenu:[
      {
        label:'Create new workflow',
        accelerator: process.platform == 'darwin' ? 'Command+N' : 'Ctrl+N'
      },
      {
        label:'Top up your account',
        accelerator: process.platform == 'darwin' ? 'Command+B' : 'Ctrl+B',
        click() {
          shell.openExternal('https://www.convertapi.com/a/plans')
        }
      },
      {
        label: 'Quit',
        accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click(){
          app.quit();
        }
      }
    ]
  }
];

// If OSX, add empty object to menu
if(process.platform == 'darwin'){
  mainMenuTemplate.unshift({});
}

// Add developer tools option if in dev
if(process.env.NODE_ENV !== 'production'){
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu:[
      {
        role: 'reload',
        accelerator:process.platform == 'darwin' ? 'Command+R' : 'Ctrl+R',
      },
      {
        label: 'Toggle DevTools',
        accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow){
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}
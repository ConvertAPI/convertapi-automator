const electron = require('electron');
const path = require('path');
const url = require('url');

// SET ENV
process.env.NODE_ENV = 'development';

const {app, BrowserWindow, Menu, ipcMain, shell} = electron;

let mainWindow;
let enterSecretWindow;

// Listen for app to be ready
app.on('ready', function() {
  // Create new window
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, '/assets/icons/win/icon.ico')
  });
  mainWindow.setIcon(path.join(__dirname, '/assets/icons/png/icon.png'));
  // Load html in window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'mainWindow.html'),
    protocol: 'file:',
    slashes:true
  }));
  createSecretWindow();
  // Quit app when closed
  mainWindow.on('closed', function(){
    app.quit();
  });

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

// Handle add item window
function createSecretWindow(){
  enterSecretWindow = new BrowserWindow({
    width: 350,
    height:250,
    title:'Sign In',
    frame: false,
    parent: mainWindow, 
    modal: true
  });
  enterSecretWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'enterSecretWindow.html'),
    protocol: 'file:',
    slashes:true
  }));
  // Handle garbage collection
  enterSecretWindow.on('close', function(){
    enterSecretWindow = null;
  });
}

// Catch secret:add
ipcMain.on('secret:add', function(e, secretKey){
  enterSecretWindow.close(); 
  // Still have a reference to addWindow in memory. Need to reclaim memory (Grabage collection)
  enterSecretWindow = null;
});

// Create menu template
const mainMenuTemplate =  [
  // Each object is a dropdown
  {
    label: 'File',
    submenu:[
      {
        label:'Create new workflow',
        accelerator: process.platform == 'darwin' ? 'Command+N' : 'Ctrl+N',
        click(){
          mainWindow.webContents.send('item:add');
        }
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
const electron = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const {app, BrowserWindow, Menu, ipcMain, dialog, shell, Tray} = electron;
const AutoLaunch = require('auto-launch');
const login = require('./main-process/Login/login');

// SET ENV
process.env.NODE_ENV = 'development';
const icon = process.platform == 'win32' ? path.join(__dirname, 'assets', 'icons', 'win', 'icon.ico') : path.join(__dirname, 'assets', 'icons', 'png', 'icon.png');
let mainWindow;
let settingsWindow;
let automatorProcess;

// Listen for app to be ready
app.on('ready', function() {
  let autoLauncher = new AutoLaunch({
    name: "ConvertAPI workflows"
  });
// Checking if autoLaunch is enabled, if not then enable it.
  autoLauncher.isEnabled().then(function(isEnabled) {
    if (isEnabled) return;
    autoLauncher.enable();
  }).catch(function (err) {
    throw err;
  });
  // create system tray for allways-on application
  createTray();
  // Create new window
  mainWindow = new BrowserWindow({
    icon: icon,
    width: 1100,
    opacity: 0.8,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      sandbox: false
    }
  });
  mainWindow.setIcon(icon);
  // Load html in window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'components', 'Main', 'main.html'),
    protocol: 'file:',
    slashes:true
  }));
  login.show();
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

function createTray() {
    const tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open GUI',
        click: () => console.log('Open GUI')
      },
      {
        label: 'Quit',
        click: () => console.log('Quit GUI')
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('ConvertAPI Workflows 0.0.1');
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    icon: icon,
    width: 600,
    height:300,
    title:'ConvertAPI Settings',
    frame: true,
    parent: mainWindow,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'components', 'Settings', 'settings.html'),
    protocol: 'file:',
    slashes:true
  }));
  // Handle garbage collection
  settingsWindow.on('close', function(){
    settingsWindow = null;
  });
}

// Catch files:add
ipcMain.on('files:add', function(){
  // open file select dialog
  dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
  .then(result => {
    if(!result.canceled) {
      for(let i = 0; i < result.filePaths.length; i++) {
        // File destination.txt will be created or overwritten by default.
        fs.copyFile(result.filePaths[0], "C:\\Documents\\" + result.filePaths[0].replace(/^.*[\\\/]/, ''), (err) => {
          if (err) throw err;
        });
      }
    }

  })
});

ipcMain.on('settings:open', function(){
  createSettingsWindow();
});

ipcMain.on('settings:close', function(){
  settingsWindow.close();
  settingsWindow = null;
});

ipcMain.on('open:folder', function(e, path) {
  console.log('Opening path: ' + path);
  shell.showItemInFolder(path);
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
        click() {
          shell.openExternal('https://www.convertapi.com/a/plans')
        }
      },
      {
        label:'Settings',
        accelerator: 'Alt+F2',
        click() {
          createSettingsWindow();
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
if (process.platform == 'darwin') {
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
const electron = require('electron');
const fs = require('fs');
const {app, Menu, ipcMain, dialog, shell, Tray} = electron;
const loginWindow = require('./main-process/Login/login');
const mainWindow = require('./main-process/Main/main');
const settingsWindow = require('./main-process/Settings/settings');
const Automator = require('./main-process/Automator/automator');
const config = require('./config/config')

// SET ENV
process.env.NODE_ENV = 'development';

// Listen for app to be ready
app.on('ready', function() {
  // initialize app windows
  mainWindow.init();
  if(!config.SECRET) {
    mainWindow.setOpacity(0.8);
    loginWindow.init();
  } else if(config.ACTIVE) {
    Automator.run();
  }
  // create system tray for allways-on application
  createTray();
  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

function createTray() {
    const tray = new Tray(config.ICON_PATH);
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
    tray.setToolTip('ConvertAPI Workflows');
}

// Catch files:add
ipcMain.on('files:add', function() {
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

ipcMain.on('open:folder', function(e, path) {
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
          settingsWindow.init();
        }
      },
      {
        label:'Sign out',
        accelerator: process.platform == 'darwin' ? 'Command+L' : 'Ctrl+L',
        click() {
          config.saveSettings('');
          Automator.kill();
          loginWindow.init();
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
if(process.env.NODE_ENV !== 'production') {
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
const electron = require('electron');
const {app, Menu, shell, Tray } = electron;
const mainWindow = require('./main-process/Main/main');
const settingsWindow = require('./main-process/Settings/settings');
const Automator = require('./main-process/Automator/automator');
const config = require('./config/config');
const log = require('electron-log');

// SET ENV
process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';

process.on('uncaughtException', uncaughtExceptionCallback)
function uncaughtExceptionCallback(e) {
  log.error(e.toString());
}

// Listen for app to be ready
app.on('ready', function() {
  log.info('Application started...');
  // initialize app windows
  mainWindow.init();
  // create system tray for allways-on application
  createTray();
  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

app.on('window-all-closed', () => {
  log.info('Application shutting down...')
  Automator.kill();
  if (process.platform !== 'darwin') {
   app.quit();
  }
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

// Create menu template
const mainMenuTemplate =  [
  // Each object is a dropdown
  {
    label: 'File',
    submenu:[
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
          mainWindow.showLogin();
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
  }, {
    label: 'Help',
    submenu:[
      {
        label:'Support',
        click() {
          shell.openExternal('https://help.convertapi.com')
        }
      },
      {
        label:'About',
        click() {
          shell.openExternal('https://www.convertapi.com/labs/automator')
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
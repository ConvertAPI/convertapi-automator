const electron = require('electron');
const {app, Menu, shell, Tray, dialog, Notification} = electron;
const mainWindow = require('./main-process/Main/main');
const settingsWindow = require('./main-process/Settings/settings');
const Automator = require('./main-process/Automator/automator');
const config = require('./config/config');
const log = require('electron-log');
const {autoUpdater} = require("electron-updater");
var pjson = require('../package.json');

// workaround for garbage collector in order to keep tray icon always available
let tray = null;
let window = null;
let updateDownloaded, isQuitting = false;

// SET ENV
process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';

process.on('uncaughtException', uncaughtExceptionCallback)
function uncaughtExceptionCallback(e) {
  log.error(e);
}
//log.catchErrors();

//Focus window on second instance run
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      window.maximize();
      window.show();
      window.focus();
    }
  });

  // Listen for app to be ready
  app.on('ready', function() {
    // initialize app windows
    window = mainWindow.init();
    // set application name for notifications
    if (process.platform === 'win32')
        app.setAppUserModelId(pjson.productName);
    // check for updates
    initAutoUpdates();
    // create system tray for allways-on application
    createTray();
    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu
    Menu.setApplicationMenu(mainMenu);

    // Minimze app when closed
    window.on('close', function (e) {
      if (!isQuitting) {
        e.preventDefault();
        window.hide();
      }
    });
  });
}

app.on('before-quit', () => {
  log.info('Application shutting down...')
  isQuitting = true;
  window.close();
  tray.destroy();
  Automator.kill();
  if(updateDownloaded)
    autoUpdater.quitAndInstall();
});

 function initAutoUpdates() {
  if(process.env.NODE_ENV == 'production') {
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
    })
    autoUpdater.on('update-available', (info) => {
      log.info('Update available.');
    })
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      log.info(log_message.toString());
    })
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded. Please restart the app to install the latest version.');
      updateDownloaded = true;
    });
    // check for updates once on app launch
    autoUpdater.checkForUpdatesAndNotify();
    // native notification example:
    //new Notification({ title: 'Notification title', body: 'This is a test' }).show()
  }
 }

function createTray() {
    tray = new Tray(config.ICON_PATH);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open',
        click: () => mainWindow.getWindow().show()
      },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('ConvertAPI Document Converter');
    tray.on('click', () => mainWindow.getWindow().show());
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
  }, 
  {
    label: 'View',
    submenu:[
      {
        label:'Show console',
        accelerator: process.platform == 'darwin' ? 'Command+T' : 'Ctrl+T',
        click() {
          mainWindow.toggleConsole(true);
        }
      }
    ]
  }, 
  {
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
      },
      {
        label:'Version',
        click() {
          dialog.showMessageBox({title: 'Product version', message: `${pjson.productName} v${pjson.version}`});
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
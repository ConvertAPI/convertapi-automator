const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const converter = require('../Converter/converter');

let workflow = {};

ipcMain.handle('get-source-formats', async () => {
  return await converter.getSourceFormats();
});

ipcMain.handle('get-destination-formats', async (e, srcFormat) => {
  return await converter.getDestinationFormats(srcFormat);
});

ipcMain.handle('get-converter', async (e, format) => {
  return await converter.getConverter(format.src, format.dst);
});

workflow.init = (workflowPath) => {
  createWindow(workflowPath);
}

function createWindow() {
    workflow.window = new BrowserWindow({
      icon: config.ICON_PATH,
      width: 1280,
      height:900,
      title:'ConvertAPI workflow',
      frame: true,
      modal: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    workflow.window.setMenuBarVisibility(false);
    workflow.window.loadURL(url.format({
      pathname: path.join(__dirname, '../../components', 'Workflow', 'workflow.html'),
      protocol: 'file:',
      slashes:true
    }));
    // Handle garbage collection
    workflow.window.on('close', function(){
        workflow.window = null;
    });
  }

  ipcMain.on('workflow:create', function(){
     createWindow();
  });
  
module.exports = workflow;
const { BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
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

ipcMain.handle('folder:select', async (e, format) => {
  const result = await dialog.showOpenDialog(workflow.window, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});



ipcMain.on('open-alert-dialog', function(e, data) {
  openAlertDialog(data);
});

workflow.init = (workflowPath) => {
  createWindow(workflowPath);
}

function openAlertDialog(data) {
  console.log(data.message);
  const options = {
    type: data.type,
    title: 'ConvertAPI workflows',
    buttons: ['Ok'],
    message: data.message
   }
  dialog.showMessageBox(options);
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

  ipcMain.on('workflow:save', function(e, data) {
    console.log('workflow:save')
    if (!fs.existsSync(data.path)) {
      fs.mkdir(data.path, (err) => {
        if(err)
          console.log(err);
        else
          saveWorkflowItem(data.flow, data.path);
      });
    } else
      saveWorkflowItem(data.flow, data.path);
  });

  function saveWorkflowItem(flow, parentPath) {
    if(flow) {
      let currentPath = path.join(parentPath, flow.dst);
      if (!fs.existsSync(currentPath)) {
        fs.mkdir(currentPath, (err) => {
          if(err)
            console.log(err);
          else if(flow.nextStep)
            saveWorkflowItem(flow.nextStep, currentPath);
        });
      } else
        saveWorkflowItem(flow.nextStep, currentPath);
    }
  }
  
module.exports = workflow;
const { BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const config = require('../../config/config');
const automator = require('../Automator/automator');
const converter = require('../Converter/converter');
const log = require('electron-log');

let workflow = {};

function openAlertDialog(data) {
  const options = {
    type: data.type,
    title: 'ConvertAPI workflows',
    buttons: ['Ok'],
    message: data.message
  }
  dialog.showMessageBox(options);
}

function createWindow(data) {
  workflow.window = new BrowserWindow({
    icon: config.ICON_PATH,
    width: 1280,
    height: 900,
    title: 'ConvertAPI workflow',
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
    slashes: true,
    query: data ? {"rootDir": data.rootDir, "src": data.src} : {}
  }));
  // Handle close event
  workflow.window.on('close', function (ev) {
      ev.preventDefault();
      workflow.window.webContents.send('workflow:validate');
  });
  ipcMain.on('workflow:validate:response', validateWorkflow);
}

function closeWindow() {
  workflow.window.destroy();
  workflow.window = null;
  ipcMain.removeListener('workflow:validate:response', validateWorkflow)
}

function validateWorkflow(event, value) {
  if(value == 0) {
    closeWindow();
  } else {
    dialog.showMessageBox({
      type: 'warning',
      buttons: ['Ok', 'Close anyway'],
      title: 'Incomplete',
      message: 'Workflow is invalid. Please fill in all required fields.',
      cancelId: 0,
      defaultId: 1,
      noLink: true
    }).then((val) => {
      if (val.response === 0) {
        // Cancel the close process
      } else if (workflow.window) {
        closeWindow();
      }
    })
  }
}

function generateWorkflow(dir, obj, src) {
  let files = fs.readdirSync(dir);
  files.forEach((file) => {
    let childPath = path.join(dir, file);
    // check if next step exists
    if (fs.lstatSync(childPath).isDirectory()) {
      let parameters = [];
      // read parameters from config.txt
      let configPath = path.join(childPath, 'config.txt');
      if (fs.existsSync(configPath)) {
        let parametersString = fs.readFileSync(configPath).toString();
        if (parametersString) {
          var stringArray = parametersString.split(/\r?\n/);
          for (let i = 0; i < stringArray.length; i++) {
            let kvp = stringArray[i].split('=');
            if (kvp[1]) {
              parameters[kvp[0]] = kvp[1];
            }
          }
        }
      }
      obj.nextStep = {
        src: src,
        dst: file,
        path: childPath,
        parameters: parameters,
        nextStep: null
      }
      generateWorkflow(childPath, obj.nextStep, file);
    }
  });
}

function saveWorkflowItem(flow, parentPath) {
  if (flow) {
    let currentPath = path.join(parentPath, flow.dst);
    if (!fs.existsSync(currentPath)) {
      fs.mkdir(currentPath, (err) => {
        if (err)
          log.error(err);
        else {
          if (flow.parameters.length)
            saveConfig(currentPath, flow.parameters);
          saveWorkflowItem(flow.nextStep, currentPath);
        }
      });
    } else {
      if (flow.parameters)
        saveConfig(currentPath, flow.parameters);
      saveWorkflowItem(flow.nextStep, currentPath);
    }
  } else {
    // remove child directories if flow is null
    fs.readdirSync(parentPath).filter(function (file) {
      if(fs.statSync(path.join(parentPath,file)).isDirectory()) {
            fs.rmdirSync(path.join(parentPath,file), { recursive: true });
      }
    });
  }
}

function saveConfig(dir, parameters) {
  let fileContent = '';
  for (let elem in parameters) {
    fileContent += `${elem}=${parameters[elem]}\n`;
  }
  if (fileContent.length) {
    fs.writeFile(path.join(dir, 'config.txt'), fileContent, function (err) {
      if (err) throw err;
    });
  }
}

// Event listeners
ipcMain.handle('get-workflow', async (e, data) => {
  if(data) {
    let workflowData = { path: data.rootDir };
    generateWorkflow(data.rootDir, workflowData, data.src);
    return workflowData;
  } else
    return null;
});

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

ipcMain.on('alert-dialog:open', function (e, data) {
  openAlertDialog(data);
});

ipcMain.on('workflow:create', function () {
  createWindow();
});

ipcMain.on('workflow:edit', function (e, data) {
  createWindow(data);
});

ipcMain.on('workflow:save', function (e, data) {
  if(config.addWorkflowItem(data.path, data.src))
    automator.restart();
  if (!fs.existsSync(data.path)) {
    fs.mkdir(data.path, (err) => {
      if (err)
        log.error(err);
      else
        saveWorkflowItem(data.nextStep, data.path);
    });
  } else
    saveWorkflowItem(data.nextStep, data.path);
  e.sender.send('workflow:save:done');
});

module.exports = workflow;
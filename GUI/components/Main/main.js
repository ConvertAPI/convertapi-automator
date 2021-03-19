const electron = require('electron');
const {ipcRenderer} = electron;
const fs = require('fs');
const path = require('path');

document.querySelector('.js-open-settings').addEventListener('click', (e) => { ipcRenderer.send('settings:open'); });
document.querySelector('.js-create-workflow').addEventListener('click', (e) => { ipcRenderer.send('workflow:create'); });
let workflows = document.querySelectorAll('.js-workflow');

for(var i = 0; i < workflows.length; i++) {
  workflows[i].querySelector('.js-open-folder').addEventListener('click', (e) => { ipcRenderer.send('folder:open', e.target.getAttribute('data-path')); });
  workflows[i].querySelector('.js-select-files').addEventListener('click', (e) => { ipcRenderer.send('files:add'); });
}

ipcRenderer.on('update-workflows', (e, data) => {
  const template = document.getElementById('workflow-template');
  data.forEach(workflow => {
    if(workflow.path) {
      let title = getWorkflowName(workflow.path, 'pdf'); // todo set src format here as an initial title parameter
      console.log(title);
      const clone = template.content.cloneNode(true);
      clone.querySelector('.card-content p').textContent = title;
      document.querySelector('.js-workflow-wrapper').appendChild(clone);
    }
  });
});

function getWorkflowName(rootDir, title = '') {
  let folderFound = false;
  let nextPath = '';
  let files = fs.readdirSync(rootDir);
  files.forEach((file, idx) => {
    let childPath = path.join(rootDir, file);
    if(fs.lstatSync(childPath).isDirectory()) {
      nextPath = childPath;
      folderFound = true;
      title += ` → ${file}`;
    }
  });
  if(!folderFound) {
    return title;
  } else {
    return getWorkflowName(nextPath, title);
  }
}
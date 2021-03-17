const electron = require('electron');
const {ipcRenderer} = electron;

document.querySelector('.js-open-settings').addEventListener('click', (e) => { ipcRenderer.send('settings:open'); });
document.querySelector('.js-create-workflow').addEventListener('click', (e) => { ipcRenderer.send('workflow:create'); });
let workflows = document.querySelectorAll('.js-workflow');

for(var i = 0; i < workflows.length; i++) {
  workflows[i].querySelector('.js-open-folder').addEventListener('click', (e) => { ipcRenderer.send('folder:open', e.target.getAttribute('data-path')); });
  workflows[i].querySelector('.js-select-files').addEventListener('click', (e) => { ipcRenderer.send('files:add'); });
}


const electron = require('electron');
const {ipcRenderer} = electron;

document.querySelector('.js-open-settings').addEventListener('click', (e) => { ipcRenderer.send('settings:open'); });
let workflows = document.querySelectorAll('.js-workflow');

for(var i = 0; i < workflows.length; i++) {
  workflows[i].querySelector('.js-open-folder').addEventListener('click', (e) => { ipcRenderer.send('open:folder', e.target.getAttribute('data-path')); });
  workflows[i].querySelector('.js-select-files').addEventListener('click', (e) => { ipcRenderer.send('files:add'); });
}

ipcRenderer.on('blur:off', () => {
  document.body.className = `${document.body.className} authenticated`;
});
ipcRenderer.on('blur:on', () => {
  document.body.className = 'blur';
});
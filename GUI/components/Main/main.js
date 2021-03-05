const electron = require('electron');
const {ipcRenderer} = electron;
let workflows = document.querySelectorAll('.js-workflow');

for(var i = 0; i < workflows.length; i++) {
  workflows[i].querySelector('.js-open-folder').addEventListener('click', (e) => { ipcRenderer.send('open:folder', "C:\\Documents\\"); });
  workflows[i].querySelector('.js-select-files').addEventListener('click', (e) => { ipcRenderer.send('files:add'); });
}

ipcRenderer.on('blur:off', () => {
  document.body.className = `${document.body.className} authenticated`;
});
ipcRenderer.on('blur:on', () => {
  document.body.className = 'blur';
});
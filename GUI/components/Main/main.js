const electron = require('electron');
const {ipcRenderer} = electron;
const fs = require('fs');
const path = require('path');

document.querySelector('.js-open-settings').addEventListener('click', (e) => { ipcRenderer.send('settings:open'); });
document.querySelector('.js-create-workflow').addEventListener('click', (e) => { ipcRenderer.send('workflow:create'); });

ipcRenderer.on('update-workflows', (e, data) => {
  let wrapper = document.querySelector('.js-workflow-wrapper');
  wrapper.innerHTML = "";
  const template = document.getElementById('workflow-template');
  data.forEach(workflow => {
    if(workflow.path) {
      let model = {};
      let conversions = [];
      generateWorkflow(workflow.path, model, model.src); // todo set src format here as an initial title parameter
      getConversions(model.nextStep, conversions);
      const clone = template.content.cloneNode(true);
      clone.querySelector('.card-content p').innerHTML = conversions.length ? conversions.join(' &#8594; ') : 'Please complete the set up';
      clone.querySelector('.js-open-folder').addEventListener('click', (e) => { ipcRenderer.send('folder:open', path.join(workflow.path, ...conversions));});
      clone.querySelector('.js-select-files').addEventListener('click', (e) => { ipcRenderer.send('files:add', workflow.path); });
      clone.querySelector('.js-delete-workflow').addEventListener('click', (e) => { ipcRenderer.send('workflow:delete', workflow.path); });
      wrapper.appendChild(clone);
    }
  });
});

function generateWorkflow(dir, obj, src) {
  let files = fs.readdirSync(dir);
  files.forEach((file) => {
    let childPath = path.join(dir, file);
    if(fs.lstatSync(childPath).isDirectory()) {
      obj.nextStep = {
        src: src,
        dst: file,
        path: childPath,
        parameters: [],
        nextStep: null
      }
      generateWorkflow(childPath, obj.nextStep, file);
    }
  });
}

function getConversions(workflow, arr) {
  if(workflow && workflow.dst) {
    arr.push(workflow.dst);
    if(workflow.nextStep)
      getConversions(workflow.nextStep, arr);
  }
}
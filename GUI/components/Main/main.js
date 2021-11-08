const electron = require('electron');
const {ipcRenderer} = electron;
const fs = require('fs');
const path = require('path');
const updater = require('update-electron-app')();

document.querySelector('.js-open-settings').addEventListener('click', (e) => { ipcRenderer.send('settings:open'); });
document.querySelector('.js-close-console').addEventListener('click', (e) => { toggleConsole(false) });
document.querySelectorAll('.js-create-workflow').forEach(element => {
  element.addEventListener('click', (e) => { ipcRenderer.send('workflow:create'); });
});

const updateOnlineStatus = () => {
  ipcRenderer.send('online-status:change', navigator.onLine ? 'online' : 'offline')
  let offlineOverlay = document.querySelector('#offline');
  if(navigator.onLine)
    offlineOverlay.classList.add('hidden');
  else
    offlineOverlay.classList.remove('hidden');
}

window.addEventListener('online', updateOnlineStatus)
window.addEventListener('offline', updateOnlineStatus)
updateOnlineStatus()

// request workflows
ipcRenderer.send('workflows:request-update');

ipcRenderer.on('workflows:update', (e, data) => {
  if(data && data.length) {
    document.querySelector('#placeholder').classList.add('hidden');
    let wrapper = document.querySelector('.js-workflow-wrapper');
    wrapper.innerHTML = "";
    const template = document.getElementById('workflow-template');
    data.forEach(workflow => {
      if(workflow.path) {
        let model = {};
        let conversions = [ ];
        generateWorkflow(workflow.path, model, workflow.src);
        getConversions(model.nextStep, conversions);
        const clone = template.content.cloneNode(true);
        clone.querySelector('.card-content p').innerHTML = conversions.length > 0 ? workflow.src + ' &#8594; ' + conversions.join(' &#8594; ') : 'Please complete the set up';
        clone.querySelector('.js-open-folder').addEventListener('click', (e) => { ipcRenderer.send('folder:open', path.join(workflow.path, ...conversions))});
        clone.querySelector('.js-edit-workflow').addEventListener('click', (e) => { ipcRenderer.send('workflow:edit', {"rootDir": workflow.path, "src": workflow.src})});
        clone.querySelector('.js-delete-workflow').addEventListener('click', (e) => { ipcRenderer.send('workflow:delete', workflow.path); });
        let dropArea = clone.querySelector('.js-drop-area');
        dropArea.addEventListener('click', (e) => { ipcRenderer.send('files:select', workflow.path); });
        initDragAndDrop(dropArea, workflow.path);
        wrapper.appendChild(clone);
      }
    });
  }
  else
    document.querySelector('#placeholder').classList.remove('hidden');
});

ipcRenderer.on('console:toggle', (e, visible) => {
  toggleConsole(visible);
});

ipcRenderer.on('console:log', (e, data) => {
  logToConsole(data);
});

ipcRenderer.on('console:error', (e, data) => {
  logToConsole(data, true);
});

ipcRenderer.on('toast:show', (e, data) => {
  showToast(data);
});

function logToConsole(data, isError = false) {
  let datestamp = `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}.${new Date().getMilliseconds()}`
  let console = document.querySelector('.js-console-content')
  console.innerHTML += `<p>${datestamp} > <span ${isError ? 'class="red darken-1"': ''}>${data}</span></p>`;
  console.scrollTop = console.scrollHeight;
  toggleConsole(true);
}

function toggleConsole(visible) {
  if(visible)
    document.querySelector('body').classList.add('console-open');
  else
    document.querySelector('body').classList.remove('console-open');
}

function showToast(data) {
  let toast = document.querySelectorAll('.paper-snackbar')[0];
  if(toast.classList.contains('show')) {
    setTimeout(() => {
      showToast(data);
    }, 2000);
  }
  else {
    toast.innerHTML = data;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 10000);
  }
}

function initDragAndDrop(dropArea, rootDir) {
  ;['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false)
  })
  ;['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false)
  })
  dropArea.addEventListener('drop', handleFile, false)

  function handleFile(e) {
    let dt = e.dataTransfer;
    let files = [];
    for(let i = 0; i<dt.files.length; i++) {
      files.push(dt.files[i].path);
    }
    let data = { "filePaths" : files, "rootDir": rootDir };
    ipcRenderer.send('files:add', data);
  }
  function highlight(e) {
    e.preventDefault();
    dropArea.classList.add('highlight')
  }
  function unhighlight(e) {
    dropArea.classList.remove('highlight')
  }
}

function generateWorkflow(dir, obj, src) {
  if(fs.existsSync(dir)) {
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
}

function getConversions(workflow, arr) {
  if(workflow && workflow.dst) {
    arr.push(workflow.dst);
    if(workflow.nextStep)
      getConversions(workflow.nextStep, arr);
  }
}

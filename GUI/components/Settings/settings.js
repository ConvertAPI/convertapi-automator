const electron = require('electron');
const {ipcRenderer} = electron;
let elForm = document.querySelector('form');
let elSecret = elForm.querySelector('#secret');
let elActive = elForm.querySelector('#active');
let elAutolaunch = elForm.querySelector('#autolaunch');
let elConcurrency = elForm.querySelector('#concurrency');

elForm.addEventListener('submit', (e) => submitForm(e));

ipcRenderer.on('settings:set', function(e, config) {
    elSecret.value = config.secret;
    elActive.checked = config.active;
    elConcurrency.value = config.concurrency;
    elAutolaunch.checked = config.autolaunch;
});

function submitForm(e) {
    e.preventDefault();
    ipcRenderer.send('settings:save', {secret: elSecret.value, active: elActive.checked, concurrency: elConcurrency.value, autolaunch: elAutolaunch.checked})
}
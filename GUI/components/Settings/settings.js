const electron = require('electron');
const {ipcRenderer} = electron;
const config = require('../../config/config');

let elForm = document.querySelector('form');
let elSecret = elForm.querySelector('#secret');
let elActive = elForm.querySelector('#active');
let elAutolaunch = elForm.querySelector('#autolaunch');
let elConcurrency = elForm.querySelector('#concurrency');

elForm.addEventListener('submit', (e) => submitForm(e));

setValuesFromConfig();

function setValuesFromConfig() {
    elSecret.value = config.SECRET;
    elActive.checked = config.ACTIVE;
    elConcurrency.value = config.CONCURRENCY;
}

function submitForm(e) {
    e.preventDefault();
    ipcRenderer.send('settings:save', {secret: elSecret.value, active: elActive.checked, concurrency: elConcurrency.value, autolaunch: elAutolaunch.checked})
}
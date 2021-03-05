const electron = require('electron');
const { ipcRenderer, shell } = electron;
const secret = document.querySelector('#secret');

document.querySelector('form').addEventListener('submit', submitForm);
document.getElementById('get-secret').addEventListener('click', () => { shell.openExternal('https://www.convertapi.com/a/signup'); });

function submitForm(e) {
  e.preventDefault();
  // check if secret is valid
  if (secret.value) {
    fetch('https://v2.convertapi.com/user?Secret=' + secret.value)
      .then(function (response) {
        if (response.ok && response.status == 200)
          return response.json();
        else {
          showValidationError();
          return false;
        }
      })
      .then(function (myJson) {
        if(myJson) {
          ipcRenderer.send('secret:add', secret.value);
        }
      });
  } else {
    showValidationError();
  }
}

function showValidationError() {
  secret.className = 'validate invalid';
  document.getElementById('validation-error').innerText = 'Authorization error - bad secret';
}
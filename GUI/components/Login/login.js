const electron = require('electron');
const { ipcRenderer, shell } = electron;
const secret = document.querySelector('#secret');

document.querySelector('form').addEventListener('submit', submitForm);
document.getElementById('get-secret').addEventListener('click', () => { shell.openExternal('https://www.convertapi.com/a/signup'); });
ipcRenderer.send('mainWindow:blur');

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
      .then(function (jsonData) {
        let secondsLeft = jsonData.SecondsLeft;
        if(secondsLeft > 0) {
          ipcRenderer.send('secret:add', secret.value);
        } else {
          showValidationError('Please top up your account!');
          return false;
        }
      });
  } else {
    showValidationError('Please enter your secret key');
  }
}

function showValidationError(message = 'Authorization error - bad secret') {
  secret.className = 'validate invalid';
  document.getElementById('validation-error').innerText = message;
}
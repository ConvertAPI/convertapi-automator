const electron = require('electron');
const { ipcRenderer, shell } = electron;
const secret = document.querySelector('#secret');

document.querySelector('form').addEventListener('submit', submitForm);
document.getElementById('get-secret').addEventListener('click', () => { shell.openExternal('https://www.convertapi.com/a/signup'); });
document.getElementById('close-application').addEventListener('click', () => { ipcRenderer.send('app:quit') });

function submitForm(e) {
  e.preventDefault();
  // check if secret is valid
  if (secret.value) {
    ipcRenderer.send('secret:add', secret.value);
  } else {
    showValidationError('Please enter your secret key');
  }
}

function showValidationError(message = 'Authorization error - bad secret') {
  secret.className = 'validate invalid';
  document.getElementById('validation-error').innerText = message;
}

ipcRenderer.on('validation:error', (e, msg) => {
  showValidationError(msg);
})

const {ipcRenderer} = require('electron');

let sourceSelect = document.querySelector('.js-src-select'); 
let destinationSelect = document.querySelector('.js-dst-select'); 

ipcRenderer.invoke('get-source-formats').then((formats) => {
    for(let i = 0; i < formats.length; i++) {
        let format = formats[i];
        let el = document.createElement("option");
        el.textContent = format;
        el.value = format;
        sourceSelect.appendChild(el);
    }
});

sourceSelect.onchange = (e) => {
    destinationSelect.innerHTML = '<option value="" disabled selected>Convert to</option>';
    ipcRenderer.invoke('get-destination-formats', e.target.value).then((formats) => {
        for(let i = 0; i < formats.length; i++) {
            let format = formats[i];
            let el = document.createElement("option");
            el.textContent = format;
            el.value = format;
            destinationSelect.appendChild(el);
        }
    });
};

destinationSelect.onchange = (e) => {
    let format = { src: sourceSelect.value, dst: e.target.value };
    console.log(format)
    ipcRenderer.invoke('get-converter', format).then((converter) => {
        console.log(converter);
    });
};

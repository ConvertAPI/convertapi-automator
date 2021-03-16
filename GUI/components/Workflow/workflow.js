const {ipcRenderer} = require('electron');

let workflowItems = [];
// create new workflow
addWorkflowItem();

function addWorkflowItem() {
    let model = {
        id: getWorkflowItemsCount(),
        src: getWorkflowItemsCount() == 0 ? '' : workflowItems[workflowItems.length-1].dst,
        dst: '',
        directory: '',
        parameters: [],
        unsavedChanges: false
    };
    createWorkflowItem(model);
    workflowItems.push(model);
    console.log(workflowItems);
}

function saveChanges(wrapper) {
    let id = wrapper.dataset.id;
    workflowItems[id].src = wrapper.dataset.src;
    workflowItems[id].dst = wrapper.dataset.dst;
    setUnsavedChanges(wrapper, false);
}

function setUnsavedChanges(wrapper, val) {
    let id = wrapper.dataset.id;
    workflowItems.find(x=>x.id == id).unsavedChanges = val;
    wrapper.querySelector('.js-save-changes').classList.toggle('hidden', !val)
}

function getWorkflowItemsCount() {
    return document.querySelectorAll('.js-workflow-item').length;
}

function getSourceSelect(wrapper) {
    if(wrapper)
        return wrapper.querySelector(`.js-src-select`);
    else
        return document.querySelectorAll(`.js-src-select`); 
}
function getDestinationSelect(wrapper) {
    if(wrapper)
        return wrapper.querySelector(`.js-dst-select`);
    else
        return document.querySelectorAll(`.js-dst-select`);
}
function getShowParamsBtn(wrapper) {
    if(wrapper)
        return wrapper.querySelector(`.js-show-params`);
    else
        return document.querySelectorAll(`.js-show-params`); 
}

function sourceSelectInit(select) {
    select.onchange = (e) => {
        const wrapper = e.target.closest('.js-workflow-item');
        wrapper.dataset.src = e.target.value;
        // reset DOM to initial state
        clearConverterHtml(wrapper);
        setUnsavedChanges(wrapper, false);
        getDestinationSelect(wrapper).innerHTML = '<option value="" disabled selected>Convert to</option>';
        wrapper.querySelector('.js-title').textContent = "Select a conversion";
        populateDestinationFormats(e.target.value, wrapper);
    };
}

function destinationSelectInit(select) {
    select.onchange = (e) => {
        const wrapper = e.target.closest('.js-workflow-item');
        wrapper.dataset.dst = e.target.value;
        clearConverterHtml(wrapper);
        if(e.target.value) {
            const src = getSourceSelect(wrapper).value;
            const dst = e.target.value;
            wrapper.querySelector('.js-title').textContent = `Convert ${src.toUpperCase()} to ${dst.toUpperCase()}`;
            getShowParamsBtn(wrapper).classList.remove('hidden');
            setUnsavedChanges(wrapper, true);
        } else 
            getShowParamsBtn(wrapper).classList.add('hidden');
    }
}

function populateDestinationFormats(src, wrapper) {
    ipcRenderer.invoke('get-destination-formats', src).then((formats) => {
        for(let i = 0; i < formats.length; i++) {
            let format = formats[i];
            let el = document.createElement("option");
            el.textContent = format;
            el.value = format;
            getDestinationSelect(wrapper).appendChild(el);
        }
    });
}

function showParamsBtnInit(btn) {
    btn.onclick = (e) => {
        e.preventDefault();
        e.target.classList.add('hidden');
        const wrapper = e.target.closest('.js-workflow-item');
        let src = wrapper.dataset.src;
        let dst = wrapper.dataset.dst;
        showConverterParameters(wrapper, src, dst);
        setUnsavedChanges(wrapper, true);
    }
}

function saveChangesBtnInit(btn) {
    btn.onclick = (e) => {
        e.preventDefault();
        const wrapper = e.target.closest('.js-workflow-item');
        saveChanges(wrapper);
    }
}

function createWorkflowItem(model) {
    const template = document.getElementById('workflow-template');
    const clone = template.content.cloneNode(true);
    let wrapper = clone.querySelector('.js-workflow-item');
    wrapper.dataset.id = model.id;
    wrapper.dataset.src = model.src;
    const srcSelect = clone.querySelector('.js-src-select');
    if(model.src) {
        srcSelect.innerHTML = "";
        let el = document.createElement("option");
        el.textContent = model.src;
        el.value = model.src;
        srcSelect.appendChild(el);
        srcSelect.value = model.src;
        populateDestinationFormats(model.src, wrapper);
    } else {
        ipcRenderer.invoke('get-source-formats').then((formats) => {
            for(let i = 0; i < formats.length; i++) {
                let format = formats[i];
                let el = document.createElement("option");
                el.textContent = format;
                el.value = format;
                srcSelect.appendChild(el);
            }
        });
    }
    clone.querySelector('.js-add-workflow-item').onclick = (e) => {
        addWorkflowItem();
    }
    sourceSelectInit(clone.querySelector('.js-src-select'));
    destinationSelectInit(clone.querySelector('.js-dst-select'));
    showParamsBtnInit(clone.querySelector('.js-show-params'));
    saveChangesBtnInit(clone.querySelector('.js-save-changes'));
    document.querySelector('.workflow-wrapper').append(clone);
}

function showConverterParameters(wrapper, src, dst) {
    let format = { src: src, dst: dst };
    console.log(format)
    ipcRenderer.invoke('get-converter', format).then((converter) => {
        const groupTemplate = document.getElementById('parameter-group-template');
        const inputTemplate = document.getElementById('input-template');
        // create dynamic elements
        converter[0].ConverterParameterGroups.forEach(group => {
            const clone = groupTemplate.content.cloneNode(true);
            clone.querySelector('legend').textContent = group.Name;
            group.ConverterParameters.forEach(param => {
                const input = inputTemplate.content.cloneNode(true);
                input.querySelector('label').textContent = param.Label;
                input.querySelector('input').setAttribute('type', 'text');
                input.querySelector('input').setAttribute('name', param.Name);
                input.querySelector('.helper-text').textContent = param.Description;
                clone.querySelector('.parameter-group').appendChild(input);
            });
            wrapper.querySelector('.js-parameter-wrapper').appendChild(clone);
            wrapper.querySelector('.js-parameter-wrapper').classList.remove('hidden');
        })
    });
}

function getInputType(str) {
    switch(str) {
        case 'File':
          return 'file';
        case 'String':
          return 'text';
          case 'Bool':
            return 'checkbox';
            case 'Integer':
                return 'number';
                case 'Collection':
                    return 'select';
        default:
            return 'text';
      }
}

function clearConverterHtml(wrapper) {
    wrapper.querySelector('.js-parameter-wrapper').classList.add('hidden');
    wrapper.querySelector('.js-parameter-wrapper').innerHTML = "";
}
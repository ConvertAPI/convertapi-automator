const electron = require('electron');
const path = require('path');
const { ipcRenderer } = electron;

let finalDestination = null;
let id = 0;
let workflow = {
    path: '',
    flow: null
}

// select root path to initialize workflow
document.addEventListener("DOMContentLoaded", function() {
    document.querySelector('#rootPath').onclick = (e) => {
        e.preventDefault();
        ipcRenderer.invoke('folder:select').then((path) => {
            if(path) {
                workflow.path = path;
                document.querySelector('#rootPathText').value = path;
                // create new workflow
                if(!workflow.flow)
                    addWorkflowItem();
                ipcRenderer.send('workflow:save', workflow);
            }
        });
        
    }
});

function addWorkflowItem() {
    if(getWorkflowItemsCount() == 0 || finalDestination) {
        let model = {
            level: id++,
            src: finalDestination,
            dst: '',
            parameters: [],
            nextStep: null,
        };
        finalDestination = null;
        createWorkflowItem(model);
        let flowItem = workflow.flow;
        if(flowItem == null) {
            workflow.flow = model;
        } else {
            while(flowItem != null) {
                if(flowItem.nextStep == null) {
                    flowItem.nextStep = model;
                    break;
                }
                else
                flowItem = flowItem.nextStep;
            }
        }
    } else {
        ipcRenderer.send('open-alert-dialog', {type: 'error', message: 'Please complete the previous step first!'});
    }
}

function saveChanges(wrapper, data) {
    let id = wrapper.dataset.id;
    let workflowItem = workflow.flow;
    for(let i = 0; i < id; i++) {
        workflowItem = workflowItem.nextStep;
    }
    workflowItem.src = wrapper.dataset.src;
    workflowItem.dst = wrapper.dataset.dst;
    if(data)
        workflowItem.parameters = data;

    finalDestination = wrapper.dataset.dst;
    setUnsavedChanges(wrapper, false);
    ipcRenderer.send('workflow:save', workflow);
}

function setUnsavedChanges(wrapper, val) {
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
            saveChanges(wrapper, null);
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

function formInit(form) {
    form.onsubmit = (e) => {
        e.preventDefault();
        let isValid = true;
        let elements = e.target.elements;
        let formData = {};
        for (let i = 0, element; element = elements[i++];) {
            if (!element.checkValidity())
                isValid = false;
            else if(element.value && element.name != 'src' && element.name != 'dst')
                formData[element.name] = element.value;
        }
        if(isValid) {
            const wrapper = e.target.closest('.js-workflow-item');
            clearConverterHtml(wrapper);
            wrapper.querySelector('.js-show-params').classList.remove('hidden');
            saveChanges(wrapper, formData);
        } else {
            alert('Form has invalid properties. Please make sure you entered all values correctly.')
        }
    }
}

function createWorkflowItem(model) {
    const template = document.getElementById('workflow-template');
    const clone = template.content.cloneNode(true);
    let wrapper = clone.querySelector('.js-workflow-item');
    wrapper.dataset.id = model.level;
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
    formInit(clone.querySelector('form'));
    document.querySelector('.workflow-wrapper').append(clone);
}

function showConverterParameters(wrapper, src, dst) {
    let format = { src: src, dst: dst };
    ipcRenderer.invoke('get-converter', format).then((converter) => {
        const groupTemplate = document.getElementById('parameter-group-template');
        const inputTemplate = document.getElementById('input-template');
        const selectTemplate = document.getElementById('select-template');
        const checkboxTemplate = document.getElementById('checkbox-template');
        const fileTemplate = document.getElementById('file-input-template');
        // create dynamic elements
        converter[0].ConverterParameterGroups.filter(x=> x.Name !== 'Input' && x.Name !== 'Authentication').forEach(group => {
            const clone = groupTemplate.content.cloneNode(true);
            clone.querySelector('legend').textContent = group.Name;
            group.ConverterParameters.forEach(param => {
                let inputType = getInputType(param.Type);
                let input;
                if(inputType == 'select') {
                    input = selectTemplate.content.cloneNode(true);
                    let select = input.querySelector('select');
                    select.setAttribute('name', param.Name);
                    if(param.Required)
                        select.required = true;
                    for (const property in param.Values) {
                        let option = document.createElement("option");
                        option.textContent = param.Values[property];
                        option.value = property;
                        select.appendChild(option);
                        select.value = param.Default;
                    }
                } else if(inputType == 'checkbox') {
                    input = checkboxTemplate.content.cloneNode(true);
                    input.querySelector('input').setAttribute('name', param.Name);
                    if(param.Default)
                        input.querySelector('input').setAttribute('checked', 'checked');
                } else if(inputType == 'file') {
                    input = fileTemplate.content.cloneNode(true);
                    input.querySelector('input[type=file]').setAttribute('name', param.Name);
                    if(param.Required)
                        input.querySelector('input[type=file]').setAttribute('required', 'required');
                    input.querySelector('input[type=file]').onchange = (e) => {
                        e.target.closest('.file-field').querySelector('.file-path').value = e.target.value;
                    }
                } else {
                    input = inputTemplate.content.cloneNode(true);
                    input.querySelector('input').setAttribute('type', inputType);
                    input.querySelector('input').setAttribute('name', param.Name);
                    if(param.Default)
                        input.querySelector('input').setAttribute('placeholder', param.Default);
                    if(param.Required)
                        input.querySelector('input').setAttribute('required', 'required');
                }
                input.querySelector('label').innerHTML = param.Label + (param.Required ? '<strong>*</strong>' : '');
                input.querySelector('.helper-text').textContent = param.Description;
                clone.querySelector('.parameter-group').appendChild(input);
            });
            wrapper.querySelector('.js-parameter-wrapper').appendChild(clone);
            wrapper.querySelector('.js-parameter-wrapper').classList.remove('hidden');
        })
    });
}

function getInputType(str) {
    switch (str) {
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


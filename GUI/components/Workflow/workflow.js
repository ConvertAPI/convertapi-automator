const electron = require('electron');
const querystring = require('querystring');
const { ipcRenderer } = electron;

let finalDestination = null;
let totalLevels = 0;
let workflow = {
    path: '',
    src: '',
    nextStep: null
}

let query = querystring.parse(global.location.search);
if(query['?rootDir'] && query['src']) {
    ipcRenderer.invoke('get-workflow', { "rootDir": query['?rootDir'], "src": query['src']}).then((data) => {
        workflow.path = data.path;
        workflow.src = data.nextStep.src;
        workflow.nextStep = data.nextStep;
        document.querySelector('#rootPathText').value = workflow.path;
        document.querySelector('#rootPath').filename = workflow.path;
        let flow = workflow.nextStep;
        while(flow) {
            createWorkflowItem(flow);
            //finalDestination = flow.dst;
            flow = flow.nextStep;
        }
    });
}


// select root path to initialize workflow
document.addEventListener("DOMContentLoaded", function() {
    document.querySelector('#rootPath').onclick = (e) => {
        e.preventDefault();
        if(!workflow.path) {
            ipcRenderer.invoke('folder:select').then((path) => {
                if(path) {
                    workflow.path = path;
                    document.querySelector('#rootPathText').value = path;
                    // create new workflow
                    if(!workflow.nextStep)
                        addWorkflowItem();
                    ipcRenderer.send('workflow:save', workflow);
                }
            });
        }
        else {
            ipcRenderer.send('folder:open', workflow.path);
        }
    }
});

ipcRenderer.on('workflow:save:done', function() {
    ipcRenderer.send('workflows:request-update');
});

ipcRenderer.on('workflow:validate', function() {
    let invalidInputs = document.querySelectorAll('[required]:invalid');
    if(invalidInputs.length)
        invalidInputs[0].focus();
    ipcRenderer.send('workflow:validate:response', invalidInputs.length);
});

function addWorkflowItem() {
    if(getWorkflowItemsCount() == 0 || finalDestination) {
        let model = {
            src: finalDestination,
            dst: '',
            parameters: [],
            nextStep: null,
        };
        finalDestination = null;
        createWorkflowItem(model);
        let flowItem = workflow.nextStep;
        if(flowItem == null) {
            workflow.nextStep = model;
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
        ipcRenderer.send('alert-dialog:open', {type: 'error', message: 'Please complete the previous step first!'});
    }
}

function saveChanges(wrapper, data, hideSaveButton = true) {
    let id = wrapper.dataset.id;
    let workflowItem = workflow.nextStep;
    for(let i = 0; i < id; i++) {
        workflowItem = workflowItem.nextStep;
    }
    workflowItem.src = wrapper.dataset.src;
    workflowItem.dst = wrapper.dataset.dst;
    if(data)
        workflowItem.parameters = data;
    // set initial workflow step format
    if(wrapper.dataset.id == 0)
        workflow.src = wrapper.dataset.src;
    finalDestination = wrapper.dataset.dstExtensions;
    ipcRenderer.send('workflow:save', workflow);
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
        hideAdvancedParameters(wrapper);
        getDestinationSelect(wrapper).innerHTML = '<option value="" disabled selected>Convert to</option>';
        wrapper.querySelector('.js-title').textContent = "Select a conversion";
        populateDestinationFormats(e.target.value, wrapper);
    };
}

function destinationSelectInit(select) {
    select.onchange = (e) => {
        const wrapper = e.target.closest('.js-workflow-item');
        let execute = false;
        if((wrapper.dataset.id+1) < getWorkflowItemsCount()) {
            if(window.confirm('Are you sure? Changing the destination format will remove all subsequent workflow steps.')) {
                execute = true;
            }
        } else 
            execute = true;
        if(execute) {
            wrapper.dataset.dst = e.target.value;
            hideAdvancedParameters(wrapper);
            if(e.target.value) {
                const src = getSourceSelect(wrapper).value;
                const dst = e.target.value;
                wrapper.querySelector('.js-title').textContent = `Convert ${src.toUpperCase()} to ${dst.toUpperCase()}`;
                clearConverterHtml(wrapper);
                getShowParamsBtn(wrapper).classList.remove('hidden');
                saveChanges(wrapper);
                // generate conversion parameters
                generateConverterParameters(wrapper, src, dst);
            } else 
                getShowParamsBtn(wrapper).classList.add('hidden');
        }
    }
}

function populateDestinationFormats(src, wrapper, dst) {
    ipcRenderer.invoke('get-destination-formats', src).then((formats) => {
        for(let i = 0; i < formats.length; i++) {
            let format = formats[i];
            let el = document.createElement("option");
            el.textContent = format;
            el.value = format;
            if(dst && dst == formats[i]) {
                wrapper.querySelector('.js-title').textContent = `Convert ${src.toUpperCase()} to ${dst.toUpperCase()}`;
                el.selected = true;
            }
            getDestinationSelect(wrapper).appendChild(el);
        }
    });
}

function showParamsBtnInit(btn) {
    btn.onclick = (e) => {
        e.preventDefault();
        e.target.classList.add('hidden');
        const wrapper = e.target.closest('.js-workflow-item');
        wrapper.classList.add('advanced');
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
            else if(element.value && element.name != 'src' && element.name != 'dst') {
                if(element.type == 'checkbox')
                    formData[element.name] = element.checked;
                else
                    formData[element.name] = element.value;
            }
        }
        if(isValid) {
            const wrapper = e.target.closest('.js-workflow-item');
            let hideSaveButton = false;
            // check if advanced view is on
            if(wrapper.classList.contains('advanced')) {
                hideSaveButton = true;
                hideAdvancedParameters(wrapper);
                wrapper.querySelector('.js-show-params').classList.remove('hidden');
            }
            saveChanges(wrapper, formData, hideSaveButton);
        } else {
            alert('Form has invalid properties. Please make sure you entered all values correctly.')
        }
    }
}

function createWorkflowItem(model) {
    const template = document.getElementById('workflow-template');
    const clone = template.content.cloneNode(true);
    let wrapper = clone.querySelector('.js-workflow-item');
    wrapper.dataset.id = totalLevels;
    totalLevels++;
    wrapper.dataset.src = model.src;
    const srcSelect = clone.querySelector('.js-src-select');
    if(model.src) {
        srcSelect.innerHTML = "";
        if(Array.isArray(model.src)) {
            model.src.forEach(elem => {
                let el = document.createElement("option");
                el.textContent = elem;
                el.value = elem;
                srcSelect.appendChild(el);
            });
            srcSelect.value = model.src[0];
            populateDestinationFormats(model.src[0], wrapper, model.dst);
        } else {
            let el = document.createElement("option");
            el.textContent = model.src;
            el.value = model.src;
            srcSelect.appendChild(el);
            srcSelect.value = model.src;
            populateDestinationFormats(model.src, wrapper, model.dst);
        }
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
    clone.querySelector('.js-delete-workflow-step').onclick = (e) => {
        deleteWorkflowItems(wrapper);
    }
    sourceSelectInit(clone.querySelector('.js-src-select'));
    destinationSelectInit(clone.querySelector('.js-dst-select'));
    showParamsBtnInit(clone.querySelector('.js-show-params'));
    formInit(clone.querySelector('form'));
    document.querySelector('.workflow-wrapper').append(clone);
    // generate conversion parameters
    if(model.dst) {
        wrapper.dataset.dst = model.dst;
        getShowParamsBtn(wrapper).classList.remove('hidden');
        generateConverterParameters(wrapper, model.src, model.dst);
    }
}

function generateConverterParameters(wrapper, src, dst) {
    let format = { src: src, dst: dst };
    let level = wrapper.dataset.id;
    let parameters = getParametersByLevel(level);
    ipcRenderer.invoke('get-converter', format).then((converter) => {
        if(converter.length > 0) {
            wrapper.dataset.dstExtensions = converter[0].DestinationExtensions;
            finalDestination = converter[0].DestinationExtensions;
            const groupTemplate = document.getElementById('parameter-group-template');
            const inputTemplate = document.getElementById('input-template');
            const selectTemplate = document.getElementById('select-template');
            const checkboxTemplate = document.getElementById('checkbox-template');
            const fileTemplate = document.getElementById('file-input-template');
            // create dynamic elements
            converter[0].ConverterParameterGroups.filter(x=> !hiddenParameterGroups().includes(x.Name)).forEach(group => {
                const clone = groupTemplate.content.cloneNode(true);
                clone.querySelector('legend').textContent = group.Name;
                group.ConverterParameters.forEach(param => {
                    let inputType = getInputType(param.Type);
                    let input;
                    if(inputType == 'select') {
                        input = selectTemplate.content.cloneNode(true);
                        let select = input.querySelector('select');
                        select.setAttribute('name', param.Name);
                        if(param.Required) {
                            select.required = true;
                            clone.querySelector('.parameter-group').classList.add('has-required-fields');
                        }
                        for (const property in param.Values) {
                            let option = document.createElement("option");
                            option.textContent = param.Values[property];
                            option.value = property;
                            select.appendChild(option);
                            if(parameters && parameters[param.Name])
                                select.value = parameters[param.Name];
                            else
                                select.value = param.Default;
                        }
                    } else if(inputType.localeCompare('checkbox') == 0) {
                        input = checkboxTemplate.content.cloneNode(true);
                        let inputField = input.querySelector('input');
                        inputField.setAttribute('name', param.Name);
                        if(parameters && parameters[param.Name] !== undefined) {
                            if(parameters[param.Name].localeCompare('true') == 0)
                                inputField.setAttribute('checked', 'checked');
                        }
                        else if(param.Default)
                            inputField.setAttribute('checked', 'checked');
                    } else if(inputType.localeCompare('file') == 0) {
                        input = fileTemplate.content.cloneNode(true);
                        let inputField = input.querySelector('input[type=file]');
                        inputField.setAttribute('name', param.Name);
                        if(param.Required) {
                            input.querySelector('.input-field').classList.add('required');
                            clone.querySelector('.parameter-group').classList.add('has-required-fields');
                            inputField.setAttribute('required', 'required');
                        }
                        //TODO: set file value
                            //if(parameters && parameters[param.Name])
                        //   inputField.value = parameters[param.Name];
                        inputField.onchange = (e) => {
                            e.target.closest('.file-field').querySelector('.file-path').value = e.target.value;
                        }
                    } else {
                        input = inputTemplate.content.cloneNode(true);
                        let inputField = input.querySelector('input');
                        inputField.setAttribute('type', inputType);
                        inputField.setAttribute('name', param.Name);
                        if(parameters && parameters[param.Name])
                            inputField.value = parameters[param.Name];
                        if(param.Default)
                            inputField.setAttribute('placeholder', param.Default);
                        if(param.Required) {
                            input.querySelector('.input-field').classList.add('required');
                            inputField.setAttribute('required', 'required');
                            inputField.onchange = (e) => {
                                wrapper.querySelector('form button[type=submit]').click();
                            }
                            clone.querySelector('.parameter-group').classList.add('has-required-fields');
                        }
                    }
                    input.querySelector('label').innerHTML = param.Label + (param.Required ? '<strong>*</strong>' : '');
                    input.querySelector('.helper-text').textContent = param.Description;
                    clone.querySelector('.parameter-group').appendChild(input);
                });
                wrapper.querySelector('.js-parameter-wrapper').appendChild(clone);
                wrapper.querySelector('.js-parameter-wrapper').classList.remove('hidden');
            })
        }
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

function getParametersByLevel(level) {
    let flow = workflow.nextStep;
    for(let i = 0; i < level; i++) {
        flow = flow.nextStep;
    }
    return flow.parameters;
}

function hiddenParameterGroups() {
    return ['Input', 'Authentication', 'Output', 'Asynchronous']
}

function hideAdvancedParameters(wrapper) {
    wrapper.classList.remove('advanced');
}

function clearConverterHtml(wrapper) {
    wrapper.querySelector('.js-parameter-wrapper').innerHTML = "";
}

function deleteWorkflowItems(wrapper) {
    if(window.confirm('Are you sure you want to delete this and all subsequent actions?')) {
        let startPos = wrapper.dataset.id;
        let workflowItem = workflow.nextStep;
        let i = 1;
        while(i < startPos) {
            finalDestination = document.querySelector(`.js-workflow-item[data-id='${i}']`).dataset.dstExtensions;
            wrapper.dataset.dstExtensions
            workflowItem = workflowItem.nextStep;
            i++;
        }
        let totalItems = getWorkflowItemsCount();
        for(i=startPos; i < totalItems; i++)
        {
            document.querySelector(`.js-workflow-item[data-id='${i}']`).remove();
        }
        totalLevels = getWorkflowItemsCount();
        console.log(totalLevels);
        workflowItem.nextStep = null;
        ipcRenderer.send('workflow:save', workflow);
    }
}

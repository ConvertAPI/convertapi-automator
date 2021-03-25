const { MSICreator } = require('electron-wix-msi');
const path = require('path');

const APP_DIR = path.resolve(__dirname, './release-builds/convert-api-workflow-win32-x64');
const OUT_DIR = path.resolve(__dirname, './windows_installer');

const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    outputDirectory: OUT_DIR,
    description: 'The ConvertAPI Automator is a batch document converter software for Windows, macOS, and Linux for converting various files from one format to another.',
    exe: 'convert-api-workflow.exe',
    name: 'ConvertAPI workflows',
    manufacturer: 'UAB Baltsoft',
    version: '1.0.2',
    appIconPath: path.resolve(__dirname, './assets/icons/win/icon.ico'),
    ui: {
        chooseDirectory: true
    },
});

msiCreator.create().then(function(){
    msiCreator.compile();
});
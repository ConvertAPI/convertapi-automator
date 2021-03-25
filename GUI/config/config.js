const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const electron = require('electron');
const { app, dialog } = electron;

// Setup file logging level
log.transports.file.level = 'info';

class Config {
    AUTOMATOR_PATH = process.platform == 'win32' ? path.join(__dirname, '../executables', 'win', 'convertapi-automator.exe')
                            : process.platform == 'darwin' ? path.join(__dirname, '../executables', 'mac', 'convertapi-automator_osx.tar')
                            : path.join(__dirname, '..', 'executables', 'linux', 'convertapi-automator_linux.tar');
    ICON_PATH = process.platform == 'win32' ? path.join(__dirname, '..', 'assets', 'icons', 'win', 'icon.ico') : path.join(__dirname, '../assets', 'icons', 'png', 'icon.png');
    CARA_PATH = 'https://v2.convertapi.com/';
    CONFIG_PATH = '';
    SECRET = '';
    ACTIVE = true;
    START_ON_BOOT = false;
    CONCURRENCY = 10;
    workflows = [];

    constructor() {
        if(app) {
            let userDataPath = app.getPath('userData');
            this.CONFIG_PATH = path.join(userDataPath, 'config.json');
        }
        this.loadSettings();
    }

    loadSettings() {
        if (fs.existsSync(this.CONFIG_PATH)) {
            // read from config.json
            let data = fs.readFileSync(this.CONFIG_PATH);
            if(data.toString()) {
                try {
                    let settings = JSON.parse(data);
                    this.SECRET = settings.secret;
                    if(typeof(settings.active) !== 'undefined')
                        this.ACTIVE = settings.active;
                    if(typeof(settings.startOnBoot) !== 'undefined')
                        this.START_ON_BOOT = settings.startOnBoot;
                    this.CONCURRENCY = settings.concurrency;
                    this.workflows = settings.workflows;
                }
                catch (err) {
                    console.log(err);
                    log.error(err);
                }
            }
        } else {
            // set defaults
            this.saveSettings('', 'true', 10);
        }
    }

    saveSettings(secret, active, concurrency, startOnBoot) {
        // create settings object to store in config.json
        let settings = {
            secret: typeof(secret) == 'undefined' ? this.SECRET : secret,
            active: typeof(active) == 'undefined' ? this.ACTIVE : active,
            startOnBoot: typeof(startOnBoot) == 'undefined' ? this.START_ON_BOOT : startOnBoot,
            concurrency: concurrency || this.CONCURRENCY
          };
          // set global settings
          this.ACTIVE = settings.active;
          this.SECRET = settings.secret;
          this.CONCURRENCY = settings.concurrency;
          this.START_ON_BOOT = settings.startOnBoot;
          this.storeToFile(settings);
    }

    getWorkflows() {
        return this.workflows;
    }

    addWorkflowItem(rootDir, src) {
        let dataJson = fs.readFileSync(this.CONFIG_PATH);
        let result = false;
        if(dataJson) {
            let data = JSON.parse(dataJson);
            if(!data.workflows)
                data.workflows = [];
            if(!data.workflows.find(x=>x.path.localeCompare(rootDir) == 0)) { {
                // add item
                result = true;
                data.workflows.push({path: rootDir, src: src});
            }
            } else if(data.workflows.find(x=>x.path.localeCompare(rootDir) == 0).src != src) {
                // update item
                data.workflows[data.workflows.findIndex(x=> x.path.localeCompare(rootDir) == 0)] = ({path: rootDir, src: src});
            }
            this.workflows = data.workflows;
            this.storeToFile(data);
        }
        return result;
    }

    deleteWorkflowItem(rootDir) {
        let dataJson = fs.readFileSync(this.CONFIG_PATH);
        let data = JSON.parse(dataJson);
        if(data.workflows && data.workflows.find(x=> x.path.localeCompare(rootDir) == 0)) {
            let todelete = data.workflows.splice(data.workflows.findIndex(x=> x.path.localeCompare(rootDir) == 0),1)
            this.workflows = data.workflows;
            this.storeToFile(data);
        }
    }

    storeToFile(settings) {
            var data = JSON.stringify(settings);
            let configPath = this.CONFIG_PATH;
            fs.writeFile(this.CONFIG_PATH, data, function (err) {
                if (err) {
                    console.log(err.message);
                    log.error(err.message);
                    return;
                }
            });
        }
    }

module.exports = new Config();
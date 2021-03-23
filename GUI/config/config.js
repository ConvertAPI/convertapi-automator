const path = require('path');
const fs = require('fs');
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

class Config {

    AUTOMATOR_PATH = process.platform == 'win32' ? path.join(__dirname, '../executables', 'win', 'convertapi-automator.exe')
                            : process.platform == 'darwin' ? path.join(__dirname, '../executables', 'mac', 'convertapi-automator_osx.tar')
                            : path.join(__dirname, '..', 'executables', 'linux', 'convertapi-automator_linux.tar');
    ICON_PATH = process.platform == 'win32' ? path.join(__dirname, '..', 'assets', 'icons', 'win', 'icon.ico') : path.join(__dirname, '../assets', 'icons', 'png', 'icon.png');
    CARA_PATH = 'https://stag-v2.convertapi.com/';
    SECRET = '';
    ACTIVE = true;
    CONCURRENCY = 10;
    workflows = [];

    constructor() {
        this.loadSettings();
    }

    loadSettings() {
        let data = fs.readFileSync(CONFIG_PATH);
        if(data.toString()) {
            try {
                let settings = JSON.parse(data);
                this.SECRET = settings.secret;
                this.ACTIVE = settings.active;
                this.CONCURRENCY = settings.concurrency;
                this.workflows = settings.workflows;
              }
              catch (err) {
                console.log(err);
              }
        }
    }

    saveSettings(secret, active, concurrency) {
        // create settings object to store in config.json
        let settings = {
            secret: typeof(secret) == undefined ? this.SECRET : secret,
            active: typeof(active) == undefined ? this.ACTIVE : active,
            concurrency: concurrency || this.CONCURRENCY
          };
          // set global settings
          this.ACTIVE = settings.active;
          this.SECRET = settings.secret;
          this.CONCURRENCY = settings.concurrency; 
          this.storeToFile(settings);
    }

    getWorkflows() {
        return this.workflows;
    }

    addWorkflowItem(path) {
        let dataJson = fs.readFileSync(CONFIG_PATH);
        if(dataJson) {
            let data = JSON.parse(dataJson);
            if(!data.workflows)
                data.workflows = [];
            else if(!data.workflows.find(x=>x.path.localeCompare(path) == 0)) {
                data.workflows.push({path: path});
                this.workflows = data.workflows;
                this.storeToFile(data);
            }
        }
    }

    deleteWorkflowItem(rootDir) {
        let dataJson = fs.readFileSync(CONFIG_PATH);
        let data = JSON.parse(dataJson);
        if(data.workflows && data.workflows.find(x=> x.path.localeCompare(rootDir) == 0).length > 0) {
            let todelete = data.workflows.splice(data.workflows.indexOf(x=> x.path.localeCompare(rootDir) == 0),1)
            console.log(todelete);
            this.workflows = data.workflows;
            this.storeToFile(data);
        }
    }

    storeToFile(settings) {
            var data = JSON.stringify(settings);
            fs.writeFile(CONFIG_PATH, data, function (err) {
                if (err) {
                    console.log(err.message);
                    return;
                }
            });
        }
    }

module.exports = new Config();
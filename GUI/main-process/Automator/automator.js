const child = require('child_process').execFile;
const config = require('../../config/config');
const {ipcMain} = require('electron');

class Automator {
    constructor() {
      this.automatorProcess;
    }

    run() {
        if(!this.automatorProcess || this.automatorProcess.killed) {
            console.log('AUTOMATOR start')
            // run exe file with params
            let directories = "C:\\Documents\\";
            var parameters = ["--watch", `--secret=${config.SECRET}`, `--concurrency=${config.CONCURRENCY}`, `--dir=${directories}`];
            this.automatorProcess = child(config.AUTOMATOR_PATH, parameters, {shell: true}, function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        } else {
            console.log(this.automatorProcess)
        }
    }

    kill() {
        if(this.automatorProcess) {
            console.log('AUTOMATOR kill')
            this.automatorProcess.kill();
        }
    }
}
module.exports = new Automator();

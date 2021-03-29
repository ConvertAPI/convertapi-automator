const child = require('child_process').execFile;
const config = require('../../config/config');
const log = require('electron-log');

class Automator {
    constructor() {
      this.automatorProcess;
    }

    run() {
        if(config.ACTIVE && config.getWorkflows() && config.getWorkflows().length > 0 && (!this.automatorProcess || this.automatorProcess.killed)) {
            log.info('AUTOMATOR exe start')
            // run exe file with params
            let directories = '';
            config.getWorkflows().map(x=>x.path).forEach(dir => {
                directories += `--dir="${dir}" `
            })
            var parameters = ["--watch", `--secret=${config.SECRET}`, `--concurrency=${config.CONCURRENCY}`, directories];
            this.automatorProcess = child(config.AUTOMATOR_PATH, parameters, {shell: true}, function(err, data) {
                log.error(err.toString());
            });
            // this.automatorProcess.stdout.on('data', (data) => {
            //     console.log(data.toString());
            // });
            this.automatorProcess.stderr.on('data', (data) => {
                log.error(data.toString());
            });
        }
    }

    kill() {
        if(this.automatorProcess && !this.automatorProcess.killed) {
            log.info('AUTOMATOR kill')
            this.automatorProcess.kill();
        }
    }

    restart() {
        this.kill();
        this.run();
    }
}
module.exports = new Automator();

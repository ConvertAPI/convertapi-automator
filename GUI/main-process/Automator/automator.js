const child = require('child_process').execFile;
const config = require('../../config/config');

class Automator {
    constructor() {
      this.automatorProcess;
    }

    run() {
        if(config.ACTIVE && (!this.automatorProcess || this.automatorProcess.killed)) {
            console.log('AUTOMATOR start')
            // run exe file with params
            let directories = '';
            config.getWorkflows().map(x=>x.path).forEach(dir => {
                directories += `--dir="${dir}" `
            })
            var parameters = ["--watch", `--secret=${config.SECRET}`, `--concurrency=${config.CONCURRENCY}`, directories];
            this.automatorProcess = child(config.AUTOMATOR_PATH, parameters, {shell: true}, function(err, data) {
                console.log(err)
                console.log(data.toString());
            });

            // this.automatorProcess.stdout.on('data', (data) => {
            //     console.log(data.toString());
            // });
            this.automatorProcess.stderr.on('data', (data) => {
                console.log(data.toString());
            });
        }
    }

    kill() {
        if(this.automatorProcess && !this.automatorProcess.killed) {
            console.log('AUTOMATOR kill')
            this.automatorProcess.kill();
        }
    }

    restart() {
        this.kill();
        this.run();
    }
}
module.exports = new Automator();

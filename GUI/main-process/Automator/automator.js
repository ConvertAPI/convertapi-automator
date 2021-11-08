const { spawn } = require('child_process');
const config = require('../../config/config');
const log = require('electron-log');

class Automator {
    constructor() {
      this.automatorProcess;
      this.mainWindow;
    }

    run(mainWindow) {
        this.mainWindow = mainWindow;
        if(config.ACTIVE && config.getWorkflows() && config.getWorkflows().length > 0 && (!this.automatorProcess || this.automatorProcess.killed)) {
            log.info('AUTOMATOR exe start')
            // run exe file with params
      
            this.automatorProcess = spawn(config.AUTOMATOR_PATH, this.getParameters());
            this.automatorProcess.stdout.on('data', (data) => {
                // log info to user console
                this.mainWindow.webContents.send('console:log', data.toString());
            });
            this.automatorProcess.stderr.on('data', (data) => {
                this.mainWindow.webContents.send('console:error', data.toString());
                // this.mainWindow.webContents.send('toast:show', data.toString());
                log.error(data.toString());
            });
            this.automatorProcess.on('close', (code) => {
                log.info(`child process exited with code ${code}`);
            });
        }
    }

    getParameters() {
        let parameters = ["--watch", `--secret=${config.SECRET}`, `--concurrency=${config.CONCURRENCY}`];
        config.getWorkflows().map(x=>x.path).forEach(dir => {
            parameters.push(`--dir="${dir}"`);
        });
        return parameters;
    }

    kill() {
        if(this.automatorProcess && !this.automatorProcess.killed) {
            log.info('AUTOMATOR kill')
            this.automatorProcess.kill('SIGINT');
        }
    }

    restart() {
        this.kill();
        this.run(this.mainWindow);
    }
}
module.exports = new Automator();

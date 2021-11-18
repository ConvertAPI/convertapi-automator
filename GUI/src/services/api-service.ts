const { net } = require('electron');
const config = require('../config/config');

class ApiService {

    constructor() { }
 
    getUserInfo(secretKey) {
        return new Promise((resolve, reject) => {
            let request = net.request({
                url: `${config.CARA_PATH}/user?Secret=${secretKey}`
            });
            request.on('response', (response) => {
                if (response.statusCode == 200) {
                    response.on('data', (chunk) => {
                        resolve(JSON.parse(chunk.toString()));
                    });
                }
                else {
                    reject();
                }
            });
            request.end();
        });
    }
}

module.exports = new ApiService();

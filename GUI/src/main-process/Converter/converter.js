const { app, net, TouchBarScrubber } = require('electron');
const config = require('../../config/config');

class Converter {
  constructor() {
    let _this = this;
    app.on('ready', function () {
      _this.getConverterInfo().then(info => {
        _this.converterInfo = info;
      });
    });
   }

  getConverterInfo() {
    return new Promise((resolve, reject) => {
      if(this.converterInfo)
        resolve(this.converterInfo)
      else 
      {
          let converterInfoString = '';
          let request = net.request({
            url: `${config.CARA_PATH}/info`,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          request.on('response', (response) => {
            if (response.statusCode == 200) {
              response.on('data', (chunk) => {
                converterInfoString += chunk;
              });
              response.on('end', () => {
                let converterInfo = JSON.parse(converterInfoString);
                resolve(converterInfo);
              });
            }
            else {
              reject();
            }
          });
          request.end()
    }
    });
  }

  getSourceFormats() {
    return this.getConverterInfo().then(converterInfo => {
      let result = [];
      converterInfo.forEach(converter => {
        result.push(...converter.SourceFileFormats);
      })
      return result.filter(this.distinct).sort((a, b) => a.localeCompare(b));
    });
  }

  getConverter(src, dst) {
    return this.getConverterInfo().then(converterInfo => {
      return converterInfo.filter(x=> x.SourceFileFormats.indexOf(src) > -1 && x.DestinationFileFormats.indexOf(dst) > -1)
                          .sort((a, b) => Number(a.Alternative) - Number(b.Alternative));
    });
  }

  getDestinationFormats(srcFormat) {
    if(Array.isArray(srcFormat))
      srcFormat = srcFormat[0];
    return this.getConverterInfo().then(converterInfo => {
      let result = [];
      if(srcFormat == 'any') {
        converterInfo.forEach(converter => {
          result.push(...converter.DestinationFileFormats);
        })
      } else {
        converterInfo.filter(x=>x.SourceFileFormats.indexOf(srcFormat) > -1).forEach(converter => {
          result.push(...converter.DestinationFileFormats);
        })
      }
      //return result.filter(this.distinct).filter(x=> x!=='zip' && x!=='merge').sort((a, b) => a.localeCompare(b));
      return result.filter(this.distinct).sort((a, b) => a.localeCompare(b));
    });
  }

  
  getDestinationFormatsByDestinationOnly(dst) {
    // called only when first step is any -> * and converter not found
    return this.getConverterInfo().then(converterInfo => {
      return converterInfo.filter(x=> x.DestinationFileFormats.indexOf(dst) > -1)
                          .sort((a, b) => Number(a.Alternative) - Number(b.Alternative))
                          .map(x => x.DestinationExtensions).filter(this.distinct).flat();
    });
  }

  distinct(value, index, self) {
    return self.indexOf(value) === index;
  }

}

module.exports = new Converter();
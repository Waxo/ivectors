const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const LSTPath = `${ivectorsPath}/lst`;

const createLST = () => {
  return fs.removeAsync(LSTPath)
    .finally(() => fs.mkdirAsync(LSTPath))
    .then(() => fs.readFileAsync(`${ivectorsPath}/data.lst`))
    .then(data => {
      const fileList = data.toString().split('\n');
      return BluebirdPromise.map(fileList, file => {
        if (file) {
          return fs.writeFileAsync(`${LSTPath}/${file.split('/')[1]}.lst`,
            data.toString().replace(`${file}\n`, ''));
        }
      });
    });
};

export {createLST};

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const createIVTest = (rawIVectorsPath, testIVectorsPath, contextPath) => {
  let classes = '';
  let ndx = '';
  const regExt = /\.y/g;
  return new BluebirdPromise(resolve => {
    fs.readdirAsync(rawIVectorsPath)
      .then((ivTrain) => {
        classes = ivTrain.join(' ').replace(regExt, '');
        return fs.readdirAsync(testIVectorsPath);
      })
      .then(files => {
        files.forEach(file => {
          file = file.replace('.y', '');
          ndx += `${file} ${classes}` + '\n';
        });
        return fs.writeFileAsync(`${contextPath}/ivTest.ndx`, ndx);
      })
      .then(() => fs.readdirAsync(testIVectorsPath))
      .then((files) => {
        let copyFiles = [];
        files.forEach((file) => {
          copyFiles.push(fs.copyAsync(`${testIVectorsPath}/${file}`,
            `${rawIVectorsPath}/${file}`));
        });
        return BluebirdPromise.all(copyFiles);
      })
      .then(() => resolve());
  });
};

export {createIVTest};

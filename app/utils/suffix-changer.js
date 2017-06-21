const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');

const suffixChanger = (workingDir, suffix) => {
  return fs.readdir(`${process.cwd()}/${workingDir}`)
    .then(dirs => {
      return BluebirdPromise.map(dirs, dir => {
        return fs.readdir(`${process.cwd()}/${workingDir}/${dir}`)
          .then(files => {
            return BluebirdPromise.map(files, file => {
              const [fileName, ext] = file.split('.');
              const [root] = fileName.split('_');
              const newName = `${root}${suffix}${(ext) ? `.${ext}` : ''}`;
              return fs.rename(`${process.cwd()}/${workingDir}/${dir}/${file}`,
                `${process.cwd()}/${workingDir}/${dir}/${newName}`);
            });
          });
      });
    })
    .then(() => console.log('Suffixes changed'));
};

module.exports = {suffixChanger};

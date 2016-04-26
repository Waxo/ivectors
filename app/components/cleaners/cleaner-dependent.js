import Ember from 'ember';
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const dependentPath = `${ivectorsPath}/dependent`;

export default Ember.Component.extend({
  actions: {
    cleanTestFiles() {
      let testFiles = [];
      fs.readFileAsync(`${dependentPath}/input/input.lst`)
        .then((files) => {
          testFiles = files.toString().split('\n');
          return fs.readdirAsync(`${dependentPath}/classes`);
        })
        .then((dirs) => {
          let filesRemover = [];
          dirs.forEach(dir => {
            testFiles.forEach(file => {
              filesRemover.push(
                fs.remove(`${dependentPath}/classes/${dir}/iv/raw/${file}.y`));
            });
          });
          return BluebirdPromise.all(filesRemover);
        })
        .then(() => fs.remove(`${dependentPath}/input`));
    }
  }
});

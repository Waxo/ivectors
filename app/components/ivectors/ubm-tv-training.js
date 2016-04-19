import Ember from 'ember';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs'));
const rimraf = BluebirdPromise.promisify(require('rimraf'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const contextPath = `${ivectorsPath}/0_2_UBM_TotalVariability`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const gmmPath = `${ivectorsPath}/gmm`;

const cleanAndRegenerateGMM = function () {
  return new BluebirdPromise((resolve) => {
    rimraf(gmmPath)
      .then(() => fs.mkdirAsync(gmmPath))
      .finally(() => resolve());
  });
};

const cleanAndRegenerateTV = function () {
  return new BluebirdPromise((resolve) => {
    rimraf(`${ivectorsPath}/mat`)
      .then(() => fs.mkdirAsync(`${ivectorsPath}/mat`))
      .then(() => resolve());
  });
};

export default Ember.Component.extend({
  isUBMDone: false,
  isUBMProcess: false,
  isTVDone: false,
  isTVProcess: false,
  actions: {
    trainUBM() {
      cleanAndRegenerateGMM().then(() => {
        console.log('UBM');
        this.set('isUBMProcess', true);
        let command = `${contextPath}/TrainWorld`;
        let options = [
          `--config ${contextPath}/cfg/TrainWorld.cfg`,
          `--inputFeatureFilename ${ivectorsPath}/data.lst`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}`,
          `--mixtureFilesPath ${gmmPath}/`
        ];

        let execute = `${command} ${options.join(' ')}`;
        console.log(execute);
        exec(execute, (error, stdout, stderr) => {
          if (stderr) {
            console.log(`stderr: ${stderr}`);
          }
          if (error !== null) {
            console.log(`exec error: ${error}`);
          }
          this.set('isUBMProcess', false);
          this.set('isUBMDone', true);
        });
      });
    },

    trainTotalVariability() {
      fs.createReadStream(`${ivectorsPath}/data.lst`)
        .pipe(fs.createWriteStream(`${contextPath}/totalvariability.ndx`));
      cleanAndRegenerateTV().then(() => {
        console.log('TotalVariability');
        this.set('isTVProcess', true);
        let command = `${contextPath}/TotalVariability`;
        let options = [
          `--config ${contextPath}/cfg/TotalVariability_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${gmmPath}/`,
          `--matrixFilesPath ${ivectorsPath}/mat/`,
          `--ndxFilename ${contextPath}/totalvariability.ndx`
        ];

        let execute = `${command} ${options.join(' ')}`;
        exec(execute, (error, stdout, stderr) => {
          if (stderr) {
            console.log(`stderr: ${stderr}`);
          }
          if (error !== null) {
            console.log(`exec error: ${error}`);
          }
          this.set('isTVProcess', false);
          this.set('isTVDone', true);
        });
      });
    }
  }
});

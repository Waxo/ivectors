import Ember from 'ember';
const exec = require('child_process').exec;
const PromiseB = require('bluebird');
const fs = PromiseB.promisifyAll(require('fs'));
const rimraf = PromiseB.promisify(require('rimraf'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const contextPath = `${ivectorsPath}/0_2_UBM_TotalVariability`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const gmmPath = `${ivectorsPath}/gmm`;

const cleanAndRegenerateGMM = function () {
  return new PromiseB((resolve) => {
    rimraf(gmmPath)
      .then(() => fs.mkdirAsync(gmmPath))
      .finally(() => resolve());
  });
};

const cleanAndRegenerateTV = function () {
  return new PromiseB((resolve) => {
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
    TrainUBM() {
      cleanAndRegenerateGMM().then(() => {
        console.log('UBM');
        this.set('isUBMProcess', true);
        let command = `${contextPath}/TrainWorld`;
        let config = `--config ${contextPath}/cfg/TrainWorld.cfg`;
        let input = `--inputFeatureFilename ${ivectorsPath}/data.lst`;
        let filePath = `--featureFilesPath ${prmPath}/`;
        let labelPath = `--labelFilesPath ${lblPath}`;
        let mixturesPath = `--mixtureFilesPath ${gmmPath}/`;
        let paths = `${filePath} ${mixturesPath} ${labelPath}`;

        let execute = `${command} ${config} ${input} ${paths}`;
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

    TrainTotalVariability() {
      fs.createReadStream(`${ivectorsPath}/data.lst`)
        .pipe(fs.createWriteStream(`${contextPath}/totalvariability.ndx`));
      cleanAndRegenerateTV().then(() => {
        console.log('TotalVariability');
        this.set('isTVProcess', true);
        let command = `${contextPath}/TotalVariability`;
        let config = `--config ${contextPath}/cfg/TotalVariability_fast.cfg`;
        let filePath = `--featureFilesPath ${prmPath}/`;
        let labelPath = `--labelFilesPath ${lblPath}/`;
        let mixturesPath = `--mixtureFilesPath ${gmmPath}/`;
        let matrixPath = `--matrixFilesPath ${ivectorsPath}/mat/`;
        let ndx = `--ndxFilename ${contextPath}/totalvariability.ndx`;
        let paths = `${filePath} ${labelPath} ${mixturesPath} ${matrixPath}`;

        let execute = `${command} ${config} ${ndx} ${paths}`;
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

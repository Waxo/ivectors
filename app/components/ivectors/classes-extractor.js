import Ember from 'ember';
import {pad} from '../../utils/pad';

const exec = require('child_process').exec;
const PromiseB = require('bluebird');
const fs = PromiseB.promisifyAll(require('fs'));
const rimraf = PromiseB.promisify(require('rimraf'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const contextPath = `${ivectorsPath}/0_3_Extract_Classes`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const matrixPath = `${ivectorsPath}/mat`;
const gmmPath = `${ivectorsPath}/gmm`;
const iv = `${ivectorsPath}/iv`;

const cleanAndRegenerateGMM = function () {
  return new PromiseB((resolve) => {
    rimraf(iv)
      .then(() => fs.mkdirAsync(iv))
      .then(() => fs.mkdirAsync(`${iv}/raw`))
      .finally(() => resolve());
  });
};

export default Ember.Component.extend({
  isPrepareDone: false,
  isPrepareProcess: false,
  isExtractDone: false,
  isExtractProcess: false,
  actions: {
    prepareExtractor() {
      this.set('isPrepareProcess', true);
      fs.readFileAsync(`${ivectorsPath}/data.lst`)
        .then(data => {
          data = data.toString().split('\n');
          let ndx = '';
          let plda = '';
          let trainModel = '';
          let currentClass = '';
          let index = 0;
          data.forEach(line => {
            if (line) {
              let [className, ] = line.split('/');
              if (currentClass !== className) {
                currentClass = className;
                index = 0;
                plda += '\n';
              }
              let filename = `${className}-${pad(index++, 5)}`;
              ndx += `${filename} ${line}` + '\n';
              plda += `${filename} `;
              trainModel += `${filename} ${filename}` + '\n';
            }
          });
          fs.writeFileSync(`${ivectorsPath}/Plda.ndx`, plda);
          fs.writeFileSync(`${ivectorsPath}/TrainModel.ndx`, trainModel);
          return fs.writeFileAsync(`${contextPath}/ivExtractor.ndx`, ndx);
        })
        .then(() => {
          this.set('isPrepareProcess', false);
          this.set('isPrepareDone', true);
        });
    },

    extractIVectors() {
      cleanAndRegenerateGMM().then(() => {
        console.log('Extractor');
        this.set('isExtractProcess', true);
        let command = `${contextPath}/IvExtractor`;
        let options = [
          `--config ${contextPath}/cfg/ivExtractor_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${gmmPath}/`,
          `--matrixFilesPath ${matrixPath}/`,
          `--saveVectorFilesPath ${iv}/raw/`,
          `--targetIdList ${contextPath}/ivExtractor.ndx`
        ];

        let execute = `${command} ${options.join(' ')}`;
        exec(execute, (error, stdout, stderr) => {
          if (stderr) {
            console.log(`stderr: ${stderr}`);
          }
          if (error !== null) {
            console.log(`exec error: ${error}`);
          }
          this.set('isExtractProcess', false);
          this.set('isExtractDone', true);
        });
      });
    }
  }
});

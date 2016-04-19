import Ember from 'ember';
import SPro from '../../../ivectors/0_1_Prepare_PRM/Spro';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const rimraf = BluebirdPromise.promisify(require('rimraf'));


const ivectorsPath = `${process.cwd()}/app/ivectors`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
// const gmmPath = `${ivectorsPath}/gmm`;
const matrixPath = `${ivectorsPath}/mat`;
const iv = `${ivectorsPath}/iv`;

const dependentPath = `${ivectorsPath}/dependent`;

const preparePath = `${ivectorsPath}/0_1_Prepare_PRM`;
const UBMPath = `${ivectorsPath}/0_2_UBM_TotalVariability`;
const extractIVPath = `${ivectorsPath}/0_3_Extract_Classes`;

let inputClassesUBM = [];

const cleanAndRegenerateGMM = function () {
  return new BluebirdPromise((resolve) => {
    rimraf(dependentPath)
      .then(() => fs.mkdirAsync(dependentPath))
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

const cleanAndRegenerateIV = function () {
  return new BluebirdPromise((resolve) => {
    rimraf(iv)
      .then(() => fs.mkdirAsync(iv))
      .then(() => fs.mkdirAsync(`${iv}/raw`))
      .finally(() => resolve());
  });
};

const dependentLST = function () {
  return new BluebirdPromise(resolve => {
    let writeFiles = [];
    let regWav = new RegExp('.wav', 'g');
    fs.readdirAsync(`${preparePath}/input`)
      .then(inputClasses => {
        inputClassesUBM = inputClasses;
        inputClasses.forEach(cluster => {
          fs.readdirAsync(`${preparePath}/input/${cluster}`)
            .then(files => {
              files.forEach((file, index) => {
                files[index] = `${cluster}/${file}`.replace(regWav, '');
              });
              files = files.join('\n');
              writeFiles.push(fs.writeFileAsync(
                `${dependentPath}/totalvariability_${cluster}.ndx`,
                files));
              writeFiles.push(
                fs.writeFileAsync(`${dependentPath}/data_${cluster}.lst`,
                  files));
            });
        });
        setTimeout(() => {
          BluebirdPromise.all(writeFiles)
            .then(() => resolve());
        }, 1000);
      });
  });
};

const dependentDir = function () {
  let dirs = [];
  inputClassesUBM.forEach(cluster => {
    dirs.push(fs.mkdirAsync(`${dependentPath}/${cluster}`));
  });
  return BluebirdPromise.all(dirs);
};

const execAsync = function (execute) {
  return new BluebirdPromise(resolve => {
    exec(execute, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
      console.log(`stdout: ${stdout}`);

      resolve();
    });
  });
};

const pad = function (num, size) {
  let s = num + '';
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
};

export default Ember.Component.extend({
  tagName: '',
  isPrepareDone: false,
  isPrepareProcess: false,
  isEnergyDone: false,
  isEnergyProcess: false,
  isFeaturesProcess: false,
  isFeaturesDone: false,
  isUBMDone: false,
  isUBMProcess: false,
  isTVDone: false,
  isTVProcess: false,
  isIVectorsDone: false,
  isIVectorsProcess: false,
  isExtractDone: false,
  isExtractProcess: false,
  actions: {
    prepareFiles() {
      console.log('Prepare');
      this.set('isPrepareProcess', true);
      var spro = SPro.create({
        path: ivectorsPath,
        specificPath: preparePath,
        input: `${preparePath}/input`,
        output: prmPath,
        label: lblPath,
        isDone: false
      });

      spro.addObserver('isDone', () => {
        this.set('isPrepareProcess', !spro.get('isDone'));
        this.set('isPrepareDone', spro.get('isDone'));
        setTimeout(() => this.send('normEnergy'), 5);
      });
    },

    normEnergy() {
      console.log('Norm Energy');
      this.set('isEnergyProcess', true);
      let command = `${preparePath}/NormFeat`;
      let options = [
        `--config ${preparePath}/cfg/NormFeat_energy.cfg`,
        `--inputFeatureFilename ${ivectorsPath}/data.lst`,
        `--featureFilesPath ${prmPath}/`
      ];

      let execute = `${command} ${options.join(' ')}`;
      exec(execute, (error, stdout, stderr) => {
        if (stderr) {
          console.log(`stderr: ${stderr}`);
        }
        if (error !== null) {
          console.log(`exec error: ${error}`);
        }

        this.set('isEnergyProcess', false);
        this.set('isEnergyDone', true);
        this.send('normFeatures');
      });
    },

    normFeatures() {
      console.log('Norm Features');
      this.set('isFeaturesProcess', true);
      let command = `${preparePath}/NormFeat`;
      let options = [
        `--config ${preparePath}/cfg/NormFeat.cfg`,
        `--inputFeatureFilename ${ivectorsPath}/data.lst`,
        `--featureFilesPath ${prmPath}/`,
        `--labelFilesPath ${lblPath}/`
      ];

      let execute = `${command} ${options.join(' ')}`;
      exec(execute, (error, stdout, stderr) => {
        if (stderr) {
          console.log(`stderr: ${stderr}`);
        }
        if (error !== null) {
          console.log(`exec error: ${error}`);
        }

        this.set('isFeaturesProcess', false);
        this.set('isFeaturesDone', true);
        this.send('trainUBM');
      });
    },

    trainUBM() {
      console.log('Train UBM');
      cleanAndRegenerateGMM()
        .then(() => dependentLST())
        .then(() => dependentDir())
        .then(() => {
          this.set('isUBMProcess', true);
          let command = `${UBMPath}/TrainWorld`;

          let executeUBM = [];
          let createGMMDirs = [];

          inputClassesUBM.forEach(cluster => {
            let dirGMM = `${dependentPath}/${cluster}/gmm`;
            let options = [
              `--config ${UBMPath}/cfg/TrainWorld.cfg`,
              `--inputFeatureFilename ${dependentPath}/data_${cluster}.lst`,
              `--featureFilesPath ${prmPath}/`,
              `--labelFilesPath ${lblPath}`,
              `--mixtureFilesPath ${dirGMM}/`
            ];

            let execute = `${command} ${options.join(' ')}`;
            createGMMDirs.push(fs.mkdirAsync(dirGMM));
            executeUBM.push(execAsync(execute));
          });

          BluebirdPromise.all(createGMMDirs)
            .then(() => BluebirdPromise.all(executeUBM))
            .then(() => {
              this.set('isUBMProcess', false);
              this.set('isUBMDone', true);
              // this.send('trainTotalVariability');
            });
        });
    },

    trainTotalVariability() {
      console.log('Train TV');
      fs.createReadStream(`${ivectorsPath}/data.lst`)
        .pipe(fs.createWriteStream(`${UBMPath}/totalvariability.ndx`));
      cleanAndRegenerateTV().then(() => {
        this.set('isTVProcess', true);
        let command = `${UBMPath}/TotalVariability`;
        let options = [
          `--config ${UBMPath}/cfg/TotalVariability_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${gmmPath}/`,
          `--matrixFilesPath ${ivectorsPath}/mat/`,
          `--ndxFilename ${UBMPath}/totalvariability.ndx`
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
          this.send('prepareIVectorsExtractor');
        });
      });
    },

    prepareIVectorsExtractor() {
      console.log('Prepare IV');
      this.set('isIVectorsProcess', true);
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
          return fs.writeFileAsync(`${extractIVPath}/ivExtractor.ndx`, ndx);
        })
        .then(() => {
          this.set('isIVectorsProcess', false);
          this.set('isIVectorsDone', true);
          this.send('extractIVectors');
        });
    },

    extractIVectors() {
      console.log('Extract IV');
      cleanAndRegenerateIV().then(() => {
        this.set('isExtractProcess', true);
        let command = `${extractIVPath}/IvExtractor`;
        let options = [
          `--config ${extractIVPath}/cfg/ivExtractor_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${gmmPath}/`,
          `--matrixFilesPath ${matrixPath}/`,
          `--saveVectorFilesPath ${iv}/raw/`,
          `--targetIdList ${extractIVPath}/ivExtractor.ndx`
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

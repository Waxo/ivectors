import Ember from 'ember';
import SPro from '../../../ivectors/0_1_Prepare_PRM/Spro';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));


const ivectorsPath = `${process.cwd()}/app/ivectors`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;

const dependentPath = `${ivectorsPath}/dependent`;

const preparePath = `${ivectorsPath}/0_1_Prepare_PRM`;
const UBMPath = `${ivectorsPath}/0_2_UBM_TotalVariability`;
const extractIVPath = `${ivectorsPath}/0_3_Extract_Classes`;

let inputClasses = [];

const dependentLST = function () {
  return new BluebirdPromise(resolve => {
    let fileWriter = [];
    let regWav = new RegExp('.wav', 'g');
    inputClasses.forEach(cluster => {
      fs.readdirAsync(`${preparePath}/input/${cluster}`)
        .then(files => {
          files.forEach((file, index) => {
            files[index] = `${cluster}/${file}`.replace(regWav, '');
          });
          files = files.join('\n');
          fileWriter.concat([
            fs.writeFileAsync(
              `${dependentPath}/${cluster}/totalvariability.ndx`,
              files),
            fs.writeFileAsync(
              `${dependentPath}/${cluster}/data.lst`, files)
          ]);
        })
        .catch(err => console.log(err));
    });

    setTimeout(() => {
      BluebirdPromise.all(fileWriter)
        .then(() => {
          resolve();
        }).catch(err => console.error(err));
    }, 1000);
  });
};

const dependentDir = function () {
  let dirs = [];
  return new BluebirdPromise(resolve => {
    fs.readdirAsync(`${preparePath}/input`)
      .then(clusters => {
        inputClasses = clusters;
        inputClasses.forEach(cluster => {
          dirs.concat([
            fs.mkdirsAsync(`${dependentPath}/${cluster}/gmm`),
            fs.mkdirsAsync(`${dependentPath}/${cluster}/mat`),
            fs.mkdirsAsync(`${dependentPath}/${cluster}/iv/raw`)
          ]);
        });
        return BluebirdPromise.all(dirs);
      })
      .then(() => {
        setTimeout(() => resolve(), 1000);
      });
  });
};

const execAsync = function (execute, stdoutON) {
  return new BluebirdPromise(resolve => {
    exec(execute, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
      if (stdoutON) {
        console.log(`stdout: ${stdout}`);
      }

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
        setTimeout(() => this.send('normEnergy'), 50);
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
        setTimeout(() => this.send('normFeatures'), 50);
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
      this.set('isUBMProcess', true);

      fs.removeAsync(dependentPath)
        .then(() => dependentDir())
        .then(() => dependentLST())
        .then(() => {
          let executeUBM = [];
          let command = `${UBMPath}/TrainWorld`;

          inputClasses.forEach(cluster => {
            let options = [
              `--config ${UBMPath}/cfg/TrainWorld.cfg`,
              `--inputFeatureFilename ${dependentPath}/${cluster}/data.lst`,
              `--featureFilesPath ${prmPath}/`,
              `--labelFilesPath ${lblPath}/`,
              `--mixtureFilesPath ${dependentPath}/${cluster}/gmm/`
            ];
            let execute = `${command} ${options.join(' ')}`;
            executeUBM.push(execAsync(execute));
          });
          BluebirdPromise.all(executeUBM)
            .then(() => {
              this.set('isUBMProcess', false);
              this.set('isUBMDone', true);
              this.send('trainTotalVariability');
            });
        });
    },

    trainTotalVariability() {
      console.log('Train TV');
      this.set('isTVProcess', true);

      let executeTV = [];
      let command = `${UBMPath}/TotalVariability`;

      inputClasses.forEach(cluster => {
        let options = [
          `--config ${UBMPath}/cfg/TotalVariability_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${dependentPath}/${cluster}/gmm/`,
          `--matrixFilesPath ${dependentPath}/${cluster}/mat/`,
          `--ndxFilename ${dependentPath}/${cluster}/totalvariability.ndx`
        ];

        let execute = `${command} ${options.join(' ')}`;
        executeTV.push(execAsync(execute));
      });

      BluebirdPromise.all(executeTV)
        .then(() => {
          this.set('isTVProcess', false);
          this.set('isTVDone', true);
          this.send('prepareIVectorsExtractor');
        });
    },

    prepareIVectorsExtractor() {
      console.log('Prepare IV');
      this.set('isIVectorsProcess', true);

      let fileWriter = [];

      inputClasses.forEach(cluster => {
        fs.readFileAsync(`${dependentPath}/${cluster}/data.lst`)
          .then((data) => {
            data = data.toString().split('\n');
            let ndx = '';
            let plda = '';
            let trainModel = '';
            let index = 0;
            data.forEach(line => {
              if (line) {
                let filename = `${cluster}-${pad(index++, 5)}`;
                ndx += `${filename} ${line}` + '\n';
                plda += `${filename} `;
                trainModel += `${filename} ${filename}` + '\n';
              }
            });
            fileWriter.concat([
              fs.writeFileAsync(`${dependentPath}/${cluster}/Plda.ndx`, plda),
              fs.writeFileAsync(`${dependentPath}/${cluster}/TrainModel.ndx`,
                trainModel),
              fs.writeFileAsync(`${dependentPath}/${cluster}/ivExtractor.ndx`,
                ndx)
            ]);
          });
      });

      BluebirdPromise.all(fileWriter).then(() => {
        this.set('isIVectorsProcess', false);
        this.set('isIVectorsDone', true);
        setTimeout(() => this.send('extractIVectors'), 50);
      });
    },

    extractIVectors() {
      console.log('Extract IV');
      this.set('isExtractProcess', true);

      let executeIV = [];

      let command = `${extractIVPath}/IvExtractor`;

      inputClasses.forEach(cluster => {
        let options = [
          `--config ${extractIVPath}/cfg/ivExtractor_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${dependentPath}/${cluster}/gmm/`,
          `--matrixFilesPath ${dependentPath}/${cluster}/mat/`,
          `--saveVectorFilesPath ${dependentPath}/${cluster}/iv/raw/`,
          `--targetIdList ${dependentPath}/${cluster}/ivExtractor.ndx`
        ];

        let execute = `${command} ${options.join(' ')}`;
        executeIV.push(execAsync(execute));
      });

      BluebirdPromise.all(executeIV)
        .then(() => {
          this.set('isExtractProcess', false);
          this.set('isExtractDone', true);
        });
    }
  }
});

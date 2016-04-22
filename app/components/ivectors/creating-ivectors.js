import Ember from 'ember';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs'));
const rimraf = BluebirdPromise.promisify(require('rimraf'));
const wavFileInfo = require('wav-file-info');

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const commandPathPRM = `${ivectorsPath}/0_1_Prepare_PRM`;
const commandPathExtractor = `${ivectorsPath}/0_3_Extract_Classes`;
const contextPath = `${ivectorsPath}/1_1_Wav_to_ivectors`;
const inputPath = `${contextPath}/input`;
const lblPath = `${contextPath}/lbl`;
const prmPath = `${contextPath}/prm`;
const ivPath = `${contextPath}/iv`;

const clean = function () {
  return new BluebirdPromise((resolve) => {
    rimraf(prmPath)
      .then(() => rimraf(ivPath))
      .then(() => rimraf(lblPath))
      .then(() => fs.unlinkAsync(`${contextPath}/input.lst`))
      .finally(() => resolve());
  });
};

const cleanAndRegenerate = function () {
  return new BluebirdPromise((resolve) => {
    clean()
      .then(() => fs.mkdirAsync(prmPath))
      .then(() => fs.mkdirAsync(ivPath))
      .then(() => fs.mkdirAsync(`${ivPath}/raw`))
      .then(() => fs.mkdirAsync(lblPath))
      .then(() => resolve());
  });
};

const writeDataAndLbl = function (files) {
  const command = `${commandPathPRM}/sfbcep`;
  files.forEach((file) => {
    let name = file.split('.')[0];
    let input = `${inputPath}/${file}`;
    let output = `${prmPath}/${name}.prm`;
    fs.appendFile(`${contextPath}/input.lst`, name + '\n');
    exec(`${command} -F PCM16 -p 19 -e -D -A ${input} ${output}`);
    wavFileInfo.infoByFilename(input, (err, info) => {
      let line = `0 ${info.duration} sound`;
      fs.writeFile(`${lblPath}/${name}.lbl`, line, () => {
      });
    });
  });
};

const energy = function () {
  console.log('Energy');
  const command = `${commandPathPRM}/NormFeat`;
  let options = [];
  options.push(`--config ${contextPath}/cfg/NormFeat_energy.cfg`);
  options.push(`--inputFeatureFilename ${contextPath}/input.lst`);
  options.push(`--featureFilesPath ${prmPath}/`);

  let execute = `${command} ${options.join(' ')}`;
  return new BluebirdPromise((resolve) => {
    exec(execute, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
      resolve();
    });
  });
};

const normalize = function () {
  console.log('Normalize');
  let command = `${commandPathPRM}/NormFeat`;
  let options = [];
  options.push(`--config ${contextPath}/cfg/NormFeat.cfg`);
  options.push(`--inputFeatureFilename ${contextPath}/input.lst`);
  options.push(`--featureFilesPath ${prmPath}/`);
  options.push(`--labelFilesPath ${lblPath}/`);
  let execute = `${command} ${options.join(' ')}`;

  return new BluebirdPromise((resolve) => {
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

export default Ember.Component.extend({
  isPRMProcess: false,
  isPRMDone: false,
  isNormFeatProcess: false,
  isNormFeatDone: false,
  isExtractProcess: false,
  isExtractDone: false,
  actions: {
    createPRM() {
      console.log('PRM');
      this.set('isPRMProcess', true);
      cleanAndRegenerate().then(() => {
        fs.readdirAsync(inputPath).then((files) => {
          writeDataAndLbl(files);
          setTimeout(() => {
            this.set('isPRMProcess', false);
            this.set('isPRMDone', true);
            this.send('energyAndFeatures');
          }, 1000);
        });
      });
    },

    energyAndFeatures() {
      this.set('isNormFeatProcess', true);
      energy()
        .then(() => normalize())
        .then(() => {
          setTimeout(() => {
            this.set('isNormFeatProcess', false);
            this.set('isNormFeatDone', true);
            this.send('prepareIVectorsExtractor');
          }, 1000);
        });
    },

    prepareIVectorsExtractor() {
      this.set('isExtractProcess', true);
      fs.readFileAsync(`${contextPath}/input.lst`)
        .then(data => {
          data = data.toString().split('\n');
          let ndx = '';
          data.forEach(line => {
            if (line) {
              ndx += `${line} ${line}` + '\n';
            }
          });
          return fs.writeFileAsync(`${contextPath}/ivExtractor.ndx`, ndx);
        })
        .then(() => {
          this.send('extractIVectors');
        });
    },

    extractIVectors() {
      console.log('Extract I-Vectors');
      const command = `${commandPathExtractor}/IvExtractor`;
      const gmmPath = `${ivectorsPath}/gmm`;
      const matrixPath = `${ivectorsPath}/mat`;
      let options = [
        `--config ${contextPath}/cfg/ivExtractor_fast.cfg`,
        `--featureFilesPath ${prmPath}/`,
        `--labelFilesPath ${lblPath}/`,
        `--mixtureFilesPath ${gmmPath}/`,
        `--matrixFilesPath ${matrixPath}/`,
        `--saveVectorFilesPath ${ivPath}/raw/`,
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
        console.log(`stdout: ${stdout}`);
        this.set('isExtractProcess', false);
        this.set('isExtractDone', true);
      });
    }
  }
});

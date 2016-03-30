import Ember from 'ember';
const exec = require('child_process').exec;
const PromiseB = require('bluebird');
const fs = PromiseB.promisifyAll(require('fs'));
const rimraf = PromiseB.promisify(require('rimraf'));
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
  return new PromiseB((resolve) => {
    rimraf(prmPath)
      .then(() => rimraf(ivPath))
      .then(() => rimraf(lblPath))
      .then(() => fs.unlinkAsync(`${contextPath}/input.lst`))
      .finally(() => resolve());
  });
};

const cleanAndRegenerate = function () {
  return new PromiseB((resolve) => {
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
  return new PromiseB((resolve) => {
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

  return new PromiseB((resolve) => {
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
    CreatePRM() {
      console.log('PRM');
      this.set('isPRMProcess', true);
      cleanAndRegenerate().then(() => {
        fs.readdirAsync(inputPath).then((files) => {
          writeDataAndLbl(files);
          setTimeout(() => {
            this.set('isPRMProcess', false);
            this.set('isPRMDone', true);
            this.send('EnergyAndFeatures');
          }, 1000);
        });
      });
    },

    EnergyAndFeatures() {
      this.set('isNormFeatProcess', true);
      energy()
        .then(() => normalize())
        .then(() => {
          setTimeout(() => {
            this.set('isNormFeatProcess', false);
            this.set('isNormFeatDone', true);
            this.send('PrepareExtractor');
          }, 1000);
        });
    },

    PrepareExtractor() {
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
          this.send('ExtractIVectors');
        });
    },

    ExtractIVectors() {
      console.log('Extract I-Vectors');
      const command = `${commandPathExtractor}/IvExtractor`;
      let options = [];
      const gmmPath = `${ivectorsPath}/gmm`;
      const matrixPath = `${ivectorsPath}/mat`;
      options.push(`--config ${contextPath}/cfg/ivExtractor_fast.cfg`);
      options.push(`--featureFilesPath ${prmPath}/`);
      options.push(`--labelFilesPath ${lblPath}/`);
      options.push(`--mixtureFilesPath ${gmmPath}/`);
      options.push(`--matrixFilesPath ${matrixPath}/`);
      options.push(`--saveVectorFilesPath ${ivPath}/raw/`);
      options.push(`--targetIdList ${contextPath}/ivExtractor.ndx`);

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

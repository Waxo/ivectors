import Ember from 'ember';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = require('wav-file-info');

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const dependentPath = `${ivectorsPath}/dependent/input`;
const clustersPath = `${ivectorsPath}/dependent/classes`;
const commandPathPRM = `${ivectorsPath}/0_1_Prepare_PRM`;
const commandPathExtractor = `${ivectorsPath}/0_3_Extract_Classes`;
const extractorPath = `${ivectorsPath}/1_1_Wav_to_ivectors`;
const inputPath = `${extractorPath}/input`;
const lblPath = `${dependentPath}/lbl`;
const prmPath = `${dependentPath}/prm`;
const ivPath = `${dependentPath}/iv/raw`;

let inputClasses = [];

const cleanAndRegenerate = function () {
  return new BluebirdPromise((resolve) => {
    fs.removeAsync(dependentPath)
      .then(() => {
        let dirWriter = [
          fs.mkdirsAsync(lblPath),
          fs.mkdirsAsync(prmPath)
        ];

        inputClasses.forEach(cluster => {
          dirWriter.push(fs.mkdirsAsync(`${ivPath}/${cluster}`));
        });

        return BluebirdPromise.all(dirWriter);
      })
      .then(() => resolve());
  });
};

const writeDataAndLbl = function (files) {
  const command = `${commandPathPRM}/sfbcep`;
  files.forEach((file) => {
    let name = file.split('.')[0];
    let input = `${inputPath}/${file}`;
    let output = `${prmPath}/${name}.prm`;
    fs.appendFile(`${dependentPath}/input.lst`, name + '\n');
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

  let options = [
    `--config ${extractorPath}/cfg/NormFeat_energy.cfg`,
    `--inputFeatureFilename ${dependentPath}/input.lst`,
    `--featureFilesPath ${prmPath}/`
  ];

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
  let options = [
    `--config ${extractorPath}/cfg/NormFeat.cfg`,
    `--inputFeatureFilename ${dependentPath}/input.lst`,
    `--featureFilesPath ${prmPath}/`,
    `--labelFilesPath ${lblPath}/`
  ];

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
      fs.readdirAsync(clustersPath)
        .then(cluster => {
          inputClasses = cluster;
          return cleanAndRegenerate();

        })
        .then(() => {
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
      fs.readFileAsync(`${dependentPath}/input.lst`)
        .then(data => {
          data = data.toString().split('\n');
          let ndx = '';
          data.forEach(line => {
            if (line) {
              ndx += `${line} ${line}` + '\n';
            }
          });
          return fs.writeFileAsync(`${dependentPath}/ivExtractor.ndx`, ndx);
        })
        .then(() => {
          this.send('extractIVectors');
        });
    },

    extractIVectors() {
      console.log('Extract I-Vectors');

      let executeIV = [];
      const command = `${commandPathExtractor}/IvExtractor`;
      inputClasses.forEach(cluster => {
        let options = [
          `--config ${extractorPath}/cfg/ivExtractor_fast.cfg`,
          `--featureFilesPath ${prmPath}/`,
          `--labelFilesPath ${lblPath}/`,
          `--mixtureFilesPath ${clustersPath}/${cluster}/gmm/`,
          `--matrixFilesPath ${clustersPath}/${cluster}/mat/`,
          `--saveVectorFilesPath ${ivPath}/${cluster}/`,
          `--targetIdList ${dependentPath}/ivExtractor.ndx`
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

import Ember from 'ember';
import parseResults from '../../../utils/parser';
import execAsync from '../../../utils/execAsync';
import {
  computeMean,
  computeMeanMatch,
  percentMatch,
  bestMatches
} from '../../../utils/maths-utils';

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const contextPath = `${ivectorsPath}/2_1_PLDA_Norm`;
const dependentPath = `${ivectorsPath}/dependent`;
const scoreDependentPath = `${dependentPath}/input/scores/PLDA`;

const fileScoreEFR = `${scoreDependentPath}/all_plda.txt`;

let inputClasses = [];

const cleanScoresDependent = () => {
  return new BluebirdPromise(resolve => {
    fs.removeAsync(scoreDependentPath)
      .then(() => fs.mkdirsAsync(scoreDependentPath))
      .then(() => resolve());
  });
};

const prepareClasses = () => {
  const regExt = /\.y/g;

  return new BluebirdPromise(resolve => {
    let testFiles = [];
    fs.readFileAsync(`${dependentPath}/input/input.lst`)
      .then(inputs => {
        testFiles = inputs.toString().split('\n');
        return fs.readdirAsync(`${dependentPath}/classes`);
      })
      .then(clusters => {
        let filesProcessor = [];
        inputClasses = clusters;
        inputClasses.forEach(cluster => {
          fs.removeAsync(`${dependentPath}/classes/${cluster}/iv/lengthNorm`)
            .then(() => fs.mkdirsAsync(
              `${dependentPath}/classes/${cluster}/iv/lengthNorm`))
            .then(() => fs.readdirAsync(
              `${dependentPath}/classes/${cluster}/iv/raw`))
            .then(trainedVectors => {
              let vectors = trainedVectors.join(' ').replace(regExt, '');
              testFiles.forEach(file => {
                if (file) {
                  let line = `${file} ${vectors}` + '\n';
                  filesProcessor.concat([
                    fs.appendFile(
                      `${dependentPath}/input/ivTest_${cluster}.ndx`,
                      line),
                    fs.copyAsync(
                      `${dependentPath}/input/iv/raw/${cluster}/${file}.y`,
                      `${dependentPath}/classes/${cluster}/iv/raw/${file}.y`)
                  ]);
                }
              });
            });
        });
        setTimeout(() => {
            BluebirdPromise.all(filesProcessor).then(() => resolve());
          },
          1000);
      });
  });
};

const normalize = () => {
  return new BluebirdPromise(resolve => {
    console.log('Normalize');
    let normIV = [];
    const command = `${contextPath}/IvNorm`;
    inputClasses.forEach(cluster => {
      let clusterPath = `${dependentPath}/classes/${cluster}`;
      fs.readdirAsync(`${dependentPath}/classes/${cluster}/iv/raw`)
        .then(ivectors => fs.writeFileAsync(`${clusterPath}/all.lst`,
          ivectors.join('\n').replace(/\.y/g, '')))
        .then(() => {
          let options = [
            `--config ${contextPath}/cfg/ivNorm.cfg`,
            `--saveVectorFilesPath ${clusterPath}/iv/lengthNorm/`,
            `--loadVectorFilesPath ${clusterPath}/iv/raw/`,
            `--matrixFilesPath ${clusterPath}/mat/`,
            `--backgroundNdxFilename ${clusterPath}/Plda.ndx`,
            `--inputVectorFilename ${clusterPath}/all.lst`
          ];

          let execute = `${command} ${options.join(' ')}`;
          normIV.push(execAsync(execute, true));
        });
    });
    setTimeout(() => BluebirdPromise.all(normIV).then(() => resolve()), 1000);
  });
};

const pldaTraining = () => {
  return new BluebirdPromise(resolve => {
    console.log('PLDA Training');
    let trainPLDA = [];
    const command = `${contextPath}/PLDA`;
    inputClasses.forEach(cluster => {
      let clusterPath = `${dependentPath}/classes/${cluster}`;
      let options = [
        `--config ${contextPath}/cfg/Plda.cfg`,
        `--testVectorFilesPath ${clusterPath}/iv/lengthNorm/`,
        `--loadVectorFilesPath ${clusterPath}/iv/lengthNorm/`,
        `--matrixFilesPath ${clusterPath}/mat/`,
        `--backgroundNdxFilename ${clusterPath}/Plda.ndx`
      ];

      let execute = `${command} ${options.join(' ')}`;
      trainPLDA.push(execAsync(execute, true));
    });
    BluebirdPromise.all(trainPLDA).then(() => resolve());
  });
};

export default Ember.Component.extend({
  results: {},
  bestMatches: false,
  actions: {
    scorePLDADependent() {
      console.log('EFR Dependent');
      prepareClasses()
        .then(() => cleanScoresDependent())
        .then(() => normalize())
        .then(() => pldaTraining())
        .then(() => {
          const command = `${ivectorsPath}/IvTest`;
          let testIV = [];

          inputClasses.forEach(cluster => {
            let clusterPath = `${dependentPath}/classes/${cluster}`;
            let options = [
              `--config ${contextPath}/cfg/ivTest_Plda.cfg`,
              `--testVectorFilesPath ${clusterPath}/iv/lengthNorm/`,
              `--loadVectorFilesPath ${clusterPath}/iv/lengthNorm/`,
              `--matrixFilesPath ${clusterPath}/mat/`,
              `--outputFilename ${scoreDependentPath}/${cluster}.txt`,
              `--backgroundNdxFilename ${clusterPath}/Plda.ndx`,
              `--targetIdList ${clusterPath}/TrainModel.ndx`,
              `--ndxFilename ${dependentPath}/input/ivTest_${cluster}.ndx`
            ];

            let execute = `${command} ${options.join(' ')}`;
            testIV.push(execAsync(execute, true));
          });

          return BluebirdPromise.all(testIV);
        }).then(() => {
          let input = fs.readdirSync(scoreDependentPath);
          var filesReader = [];
          input.forEach(file => {
            filesReader.push(
              fs.readFileAsync(`${scoreDependentPath}/${file}`));
          });

          return BluebirdPromise.all(filesReader);
        })
        .then(readers => {
          let allResults = '';
          readers.forEach(file => {
            allResults += file.toString();
          });
          return fs.writeFileAsync(fileScoreEFR, allResults);
        })
        .then(() => console.log('All done !'));
    },

    meanDependent() {
      this.set('bestMatches', false);
      parseResults(fileScoreEFR)
        .then((scores) => this.set('results', computeMean(scores)));
    },

    meanMatchDependent() {
      this.set('bestMatches', false);
      parseResults(fileScoreEFR)
        .then((scores) => this.set('results', computeMeanMatch(scores)));
    },

    percentMatchDependent() {
      this.set('bestMatches', false);
      parseResults(fileScoreEFR)
        .then((scores) => this.set('results', percentMatch(scores)));
    },

    bestMatchesDependent() {
      this.set('bestMatches', true);
      parseResults(fileScoreEFR)
        .then((scores) => this.set('results', bestMatches(scores, 10)));
    }
  }
});

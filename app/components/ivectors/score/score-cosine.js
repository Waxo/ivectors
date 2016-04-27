import Ember from 'ember';
import parseResults from '../../../utils/parser';
import execAsync from '../../../utils/execAsync';
import {
  computeMean,
  computeMeanMatch,
  percentMatch,
  bestMatches
} from '../../../utils/maths-utils';
import {createIVTest} from "../../../utils/scores";

const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const dependentPath = `${ivectorsPath}/dependent`;
const testIVectorsPath = `${ivectorsPath}/1_1_Wav_to_ivectors/iv/raw`;
const contextPath = `${ivectorsPath}/2_2_WCCN`;
const matrixPath = `${ivectorsPath}/mat`;
const scoreDependentPath = `${dependentPath}/input/scores/WCCN_cos`;

const fileScoreAll = `${contextPath}/scores_WCCN_Cosine.txt`;
const fileScoreCosine = `${scoreDependentPath}/all_cos.txt`;

let inputClasses = '';

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
          fs.readdirAsync(`${dependentPath}/classes/${cluster}/iv/raw`)
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

const cleanScoresDependent = () => {
  return new BluebirdPromise(resolve => {
    fs.removeAsync(scoreDependentPath)
      .then(() => fs.mkdirsAsync(scoreDependentPath))
      .then(() => resolve());
  });
};

export default Ember.Component.extend({
  results: {},
  bestMatches: false,
  actions: {
    scoreCosine() {
      console.log('Cosine');
      const command = `${ivectorsPath}/IvTest`;
      let options = [
        `--config ${contextPath}/cfg/ivTest_WCCN_Cosine.cfg`,
        `--testVectorFilesPath ${ivectorsPath}/iv/raw/`,
        `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
        `--matrixFilesPath ${matrixPath}`,
        `--outputFilename ${fileScoreAll}`,
        `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
        `--targetIdList ${ivectorsPath}/TrainModel.ndx`,
        `--ndxFilename ${contextPath}/ivTest.ndx`
      ];

      let execute = `${command} ${options.join(' ')}`;

      createIVTest(`${ivectorsPath}/iv/raw`, testIVectorsPath, contextPath)
        .then(() => {
          exec(execute, (error, stdout, stderr) => {
            if (stderr) {
              console.log(`stderr: ${stderr}`);
            }
            if (error !== null) {
              console.log(`exec error: ${error}`);
            }
            console.log(`stdout: ${stdout}`);
            // this.sendAction('ShowScore');
          });
        });
    },

    mean() {
      this.set('bestMatches', false);
      parseResults(fileScoreAll)
        .then(scores => this.set('results', computeMean(scores)));

    },

    meanMatch() {
      this.set('bestMatches', false);
      parseResults(fileScoreAll)
        .then((scores) => this.set('results', computeMeanMatch(scores)));
    },

    percentMatch() {
      this.set('bestMatches', false);
      parseResults(fileScoreAll)
        .then((scores) => this.set('results', percentMatch(scores)));
    },

    bestMatches() {
      this.set('bestMatches', true);
      parseResults(fileScoreAll)
        .then((scores) => this.set('results', bestMatches(scores, 10)));
    },

    scoreCosineDependent() {
      console.log('Cosine Dependent');
      prepareClasses()
        .then(() => cleanScoresDependent())
        .then(() => {
          const command = `${ivectorsPath}/IvTest`;
          let testIV = [];

          inputClasses.forEach(cluster => {
            let clusterPath = `${dependentPath}/classes/${cluster}`;
            let options = [
              `--config ${contextPath}/cfg/ivTest_WCCN_Cosine.cfg`,
              `--testVectorFilesPath ${clusterPath}/iv/raw/`,
              `--loadVectorFilesPath ${clusterPath}/iv/raw/`,
              `--matrixFilesPath ${clusterPath}/mat/`,
              `--outputFilename ${scoreDependentPath}/${cluster}.txt`,
              `--backgroundNdxFilename ${clusterPath}/Plda.ndx`,
              `--targetIdList ${clusterPath}/TrainModel.ndx`,
              `--ndxFilename ${dependentPath}/input/ivTest_${cluster}.ndx`
            ];

            let execute = `${command} ${options.join(' ')}`;
            testIV.push(execAsync(execute));
          });

          return BluebirdPromise.all(testIV);
        })
        .then(() => {
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
          return fs.writeFileAsync(fileScoreCosine, allResults);
        })
        .then(() => console.log('All done !'));
    },

    meanDependent() {
      this.set('bestMatches', false);
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', computeMean(scores)));
    },

    meanMatchDependent() {
      this.set('bestMatches', false);
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', computeMeanMatch(scores)));
    },

    percentMatchDependent() {
      this.set('bestMatches', false);
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', percentMatch(scores)));
    },

    bestMatchesDependent() {
      this.set('bestMatches', true);
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', bestMatches(scores, 10)));
    }
  }
});

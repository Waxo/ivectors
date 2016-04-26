import Ember from 'ember';
import parseResults from '../../utils/parser';
import execAsync from '../../utils/execAsync';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const dependentPath = `${ivectorsPath}/dependent`;
const testIVectorsPath = `${ivectorsPath}/1_1_Wav_to_ivectors/iv/raw`;
const contextPath = `${ivectorsPath}/2_2_WCCN`;
const matrixPath = `${ivectorsPath}/mat`;
const scoreDependentPath = `${dependentPath}/input/scores/WCCN_cos`;

const fileScoreCosine = `${scoreDependentPath}/all_cos.txt`;

let inputClasses = '';

const createIVTest = () => {
  let classes = '';
  let ndx = '';
  const regExt = /\.y/g;
  return new BluebirdPromise(resolve => {
    fs.readdirAsync(`${ivectorsPath}/iv/raw`)
      .then((ivTrain) => {
        classes = ivTrain.join(' ').replace(regExt, '');
        return fs.readdirAsync(testIVectorsPath);
      })
      .then(files => {
        files.forEach(file => {
          file = file.replace('.y', '');
          ndx += `${file} ${classes}` + '\n';
        });
        return fs.writeFileAsync(`${contextPath}/ivTest.ndx`, ndx);
      })
      .then(() => fs.readdirAsync(testIVectorsPath))
      .then((files) => {
        let copyFiles = [];
        files.forEach((file) => {
          copyFiles.push(fs.copyAsync(`${testIVectorsPath}/${file}`,
            `${ivectorsPath}/iv/raw/${file}`));
        });
        return BluebirdPromise.all(copyFiles);
      })
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

const computeMean = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster,
            scores[ivTest][cluster].scores.reduce((a, b) => a + b) /
            scores[ivTest][cluster].scores.length]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest][sortable[i][0]] = sortable[i][1];
      }
    }
  }
  return res;
};

const computeMeanMatch = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          let numerator = 0;
          for (let i = 0; i < scores[ivTest][cluster].numberOfMatches;
               i++) {
            numerator += scores[ivTest][cluster].scores[i];
          }
          sortable.push([cluster,
            numerator / scores[ivTest][cluster].numberOfMatches]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest][sortable[i][0]] = sortable[i][1];
      }
    }
  }
  return res;
};

const percentMatch = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster,
            (scores[ivTest][cluster].numberOfMatches /
            scores[ivTest][cluster].scores.length) * 100]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest][sortable[i][0]] =
          Math.floor(sortable[i][1] * 100) / 100 + ' %';
      }
    }
  }
  return res;
};

export default Ember.Component.extend({
  results: {},
  actions: {
    scoreCosine() {
      console.log('Cosine');
      const command = `${ivectorsPath}/IvTest`;
      let options = [
        `--config ${contextPath}/cfg/ivTest_WCCN_Cosine.cfg`,
        `--testVectorFilesPath ${ivectorsPath}/iv/raw/`,
        `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
        `--matrixFilesPath ${matrixPath}`,
        `--outputFilename ${contextPath}/scores_WCCN_Cosine.txt`,
        `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
        `--targetIdList ${ivectorsPath}/TrainModel.ndx`,
        `--ndxFilename ${contextPath}/ivTest.ndx`
      ];

      let execute = `${command} ${options.join(' ')}`;

      createIVTest().then(() => {
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

    showMean() {
      parseResults(`${contextPath}/scores_WCCN_Cosine.txt`)
        .then(scores => this.set('results', computeMean(scores)));

    },

    showMeanMatch() {
      parseResults(`${contextPath}/scores_WCCN_Cosine.txt`)
        .then((scores) => this.set('results', computeMeanMatch(scores)));
    },

    showPercentMatch() {
      parseResults(`${contextPath}/scores_WCCN_Cosine.txt`)
        .then((scores) => this.set('results', percentMatch(scores)));
    },

    scoreCosineDependent() {
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
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', computeMean(scores)));
    },

    meanMatchDependent() {
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', computeMeanMatch(scores)));
    },

    percentMatchDependent() {
      parseResults(fileScoreCosine)
        .then((scores) => this.set('results', percentMatch(scores)));
    }
  }
});

import Ember from 'ember';
import parseResults from '../../utils/parser';
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
var fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const testIVectorsPath = `${ivectorsPath}/1_1_Wav_to_ivectors/iv/raw`;
const contextPath = `${ivectorsPath}/2_2_WCCN`;
const matrixPath = `${ivectorsPath}/mat`;

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

export default Ember.Component.extend({
  results: {},
  actions: {
    scoreCosine() {
      console.log('Cosine');
      const command = `${ivectorsPath}/IvTest`;
      let options = [];
      options.push(`--config ${contextPath}/cfg/ivTest_WCCN_Cosine.cfg`);
      options.push(`--testVectorFilesPath ${ivectorsPath}/iv/raw`);
      options.push(`--loadVectorFilesPath ${ivectorsPath}/iv/raw`);
      options.push(`--matrixFilesPath ${matrixPath}`);
      options.push(`--outputFilename ${contextPath}/scores_WCCN_Cosine.txt`);
      options.push(`--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`);
      options.push(`--targetIdList ${ivectorsPath}/TrainModel.ndx`);
      options.push(`--ndxFilename ${contextPath}/ivTest.ndx`);

      let execute = `${command} ${options.join(' ')}`;
      console.log(`execute: ${execute}`);
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
      let res = {};
      parseResults(`${contextPath}/scores_WCCN_Cosine.txt`)
        .then(scores => {
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
          this.set('results', res);
        });
    },

    showMeanMatch() {
      let res = {};
      parseResults(`${contextPath}/scores_WCCN_Cosine.txt`)
        .then(scores => {
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
          this.set('results', res);
        });
    }
  }

});

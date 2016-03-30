import Ember from 'ember';
const exec = require('child_process').exec;
const PromiseB = require('bluebird');
const fs = PromiseB.promisifyAll(require('fs'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const testIVectorsPath = `${ivectorsPath}/1_1_Wav_to_ivectors/iv/raw`;
const contextPath = `${ivectorsPath}/2_2_WCCN`;
const matrixPath = `${ivectorsPath}/mat`;

const createIVTest = function () {
  let classes = '';
  let ndx = '';
  const regExt = /\.y/g;
  return new PromiseB(resolve => {
    // fs.readdirAsync(`${ivectorsPath}/iv/raw`)
    fs.readdirAsync(`${ivectorsPath}/0_1_Prepare_PRM/input`)
      .then((ivTrain) => {
        classes = ivTrain.join(' ').replace(regExt, '');
        return fs.readdirAsync(testIVectorsPath);
      })
      .then(files => {
        files.forEach(file => {
          file = file.replace('.y', '');
          ndx += `${file} ${classes}` + '\n';
        });
        resolve();
        // return fs.writeFileAsync(`${contextPath}/ivTest.ndx`, ndx);
      })
      .then(() => resolve());
  });
};

export default Ember.Component.extend({
  actions: {
    ScoreCosine() {
      console.log('Cosine');
      const command = `${ivectorsPath}/IvTest`;
      let options = [];
      options.push(`--config ${contextPath}/cfg/ivTest_WCCN_Cosine.cfg`);
      options.push(`--testVectorFilesPath ${testIVectorsPath}`);
      options.push(`--loadVectorFilesPath ${ivectorsPath}/iv/raw`);
      options.push(`--matrixFilesPath ${matrixPath}`);
      options.push(`--outputFilename ${contextPath}/scores_WCCN_Cosine.txt`);
      options.push(`--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`);
      options.push(`--targetIdList ${ivectorsPath}/TrainModel.ndx`);
      options.push(`--ndxFilename ${contextPath}/ivTest.ndx`);

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
        });
      });
    }
  }
});

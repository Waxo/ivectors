import Ember from "ember";
import {wavToPRM, normEnergy, normFeatures} from "../../../utils/wav-to-prm";
import {clearProject, createFolders} from "../../../utils/remove-common";
import {trainUBM, trainTotalVariability} from "../../../utils/train-ubm-tv";
import {prepareIVectorsExtractor, extractIV} from "../../../utils/extract-iv";
import {
  normalize,
  pldaTraining,
  scorePLDANorm,
  scoreCosine,
  scoreEFR,
  scoreSphNorm
} from "../../../utils/scoring-method-leave-one";
import {parseResults} from "../../../utils/parser";
import {computeMean} from "../../../utils/maths-utils";
import {countMean} from "../../../utils/leave-one-out";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const LSTPath = `${ivectorsPath}/lst`;

const failed = [];

const createLST = () => {
  return fs.removeAsync(LSTPath)
    .finally(() => fs.mkdirAsync(LSTPath))
    .then(() => fs.readFileAsync(`${ivectorsPath}/data.lst`))
    .then(data => {
      const fileList = data.toString().split('\n');
      return BluebirdPromise.map(fileList, file => {
        if (file) {
          return fs.writeFileAsync(`${LSTPath}/${file.split('/')[1]}.lst`,
            data.toString().replace(`${file}\n`, ''));
        }
      });
    });
};

const leaveOneProcess = files => {
  return new BluebirdPromise(resolve => {
    if (!files.length) {
      resolve();
    } else {
      const save = files.length;
      const currentFile = files.shift();
      const iv = {};
      leaveOneProcess(files)
        .then(() => trainUBM(currentFile))
        .then(() => trainTotalVariability(currentFile))
        .then(() => prepareIVectorsExtractor(currentFile, iv))
        .delay(50).then(() => extractIV())
        .delay(50).then(() => normalize())
        .delay(50).then(() => pldaTraining())
        .delay(1000)
        .then(() => scorePLDANorm(iv.name))
        .then(() => scoreCosine(iv.name))
        .then(() => scoreEFR(iv.name))
        .then(() => scoreSphNorm(iv.name))
        .delay(50)
        .then(() => {
          console.log(`DONE : ${currentFile} ${save}`);
          resolve();
        })
        .catch(() => {
          console.log(`ERROR: ${currentFile}`);
          failed.push(currentFile);
          resolve();
        });
    }
  });
};

const leaveOneOutResolver = files => {
  return new BluebirdPromise(resolve => {
    files = files.concat(failed);
    failed.splice(0, failed.length);
    console.log(`Left : ${files.length}`);
    if (files.length === 0) {
      resolve();
    } else {
      leaveOneProcess(files.splice(0, 10))
        .delay(5000).then(() => leaveOneOutResolver(files))
        .then(() => resolve());
    }
  });
};

export default Ember.Component.extend({
  results: {},
  actions: {
    leaveOneOut() {
      console.time('Leave one out');
      clearProject()
        .then(() => createFolders())
        .then(() => wavToPRM())
        .delay(50).then(() => normEnergy())
        .delay(50).then(() => normFeatures())
        .delay(50).then(() => createLST())
        .delay(50).then(() => fs.readdirAsync(LSTPath))
        .then(files => leaveOneOutResolver(files))
        .then(() => {
          console.timeEnd('Leave one out');
          console.log(failed);
        });
    },
    scoreLeaveOneOut() {
      const res = {};
      fs.readdirAsync(`${ivectorsPath}/save_scores`)
        .then(
          files => BluebirdPromise.map(files,
            file => parseResults(`${ivectorsPath}/save_scores/${file}`)))
        .then(scores => {
          scores.forEach(score => {
            for (const key in score) {
              if (score.hasOwnProperty(key)) {
                res[key] = score[key];
              }
            }
          });
          this.set('results', computeMean(res));
        });
    },
    countLeaveOneOut() {
      const res = {};
      fs.readdirAsync(`${ivectorsPath}/save_scores`)
        .then(
          files => BluebirdPromise.map(files,
            file => parseResults(`${ivectorsPath}/save_scores/${file}`)))
        .then(scores => {
          scores.forEach(score => {
            for (const key in score) {
              if (score.hasOwnProperty(key)) {
                res[key] = score[key];
              }
            }
          });
          this.set('results', countMean(res));
        });
    }
  }
});

import Ember from "ember";
import {
  wavToPRM,
  normEnergy,
  normFeatures
} from "../../../utils/leave-one-out/wav-to-prm";
import {
  clearProject,
  createFolders
} from "../../../utils/leave-one-out/remove-common";
import {
  trainUBM,
  trainTotalVariability
} from "../../../utils/leave-one-out/train-ubm-tv";
import {
  prepareIVectorsExtractor,
  extractIV
} from "../../../utils/leave-one-out/extract-iv";
import {
  normalize,
  pldaTraining,
  scorePLDANorm,
  scoreCosine,
  scoreEFR,
  scoreSphNorm
} from "../../../utils/leave-one-out/scoring-method-leave-one";
import {parseResults} from "../../../utils/parser";
import {computeMean} from "../../../utils/maths-utils";
import {countMean} from "../../../utils/leave-one-out/leave-one-out";
import {createLST} from "../../../utils/leave-one-out/create-lst";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const LSTPath = `${ivectorsPath}/lst`;

const failed = [];
const left = [];

const leaveOneProcess = (files, thread = '') => {
  return new BluebirdPromise(resolve => {
    if (!files.length) {
      resolve();
    } else {
      const save = files.length;
      const currentFile = files.shift();
      const iv = {};
      leaveOneProcess(files, thread)
        .then(() => trainUBM(currentFile, thread))
        .then(() => trainTotalVariability(currentFile, thread))
        .then(() => prepareIVectorsExtractor(currentFile, iv, thread))
        .delay(50).then(() => extractIV(thread))
        .delay(50).then(() => normalize(thread))
        .delay(50).then(() => pldaTraining(thread))
        .delay(1000).then(() => scorePLDANorm(iv.name, thread))
        .delay(50).then(() => scoreCosine(iv.name, thread))
        .delay(50).then(() => scoreEFR(iv.name, thread))
        .delay(50).then(() => scoreSphNorm(iv.name, thread))
        .then(() => {
          console.log(`DONE : ${currentFile} ${save}`);
          resolve();
        })
        .catch((err) => {
          console.log(`ERROR: ${currentFile}`);
          console.log(`ERROR: ${err}`);
          failed.push(currentFile);
          resolve();
        });
    }
  });
};

const leaveOneOutResolver = (files, thread = '') => {
  return new BluebirdPromise(resolve => {
    files = files.concat(failed);
    failed.splice(0, failed.length);
    left[thread || 0] = files.length;
    if (files.length === 0) {
      resolve();
    } else {
      leaveOneProcess(files.splice(0, 10), thread)
        .delay(1000).then(() => leaveOneOutResolver(files, thread))
        .then(() => resolve());
    }
  });
};

const threadLeaveOneOut = files => {
  const maxThreads = 8;
  const arraysLength = Math.ceil(files.length / maxThreads);
  let threadNum = 0;
  const arrayThreads = [];
  while (files.length) {
    arrayThreads.push(
      leaveOneOutResolver(files.splice(0, arraysLength), ++threadNum));
  }
  return BluebirdPromise.all(arrayThreads);
};


export default Ember.Component.extend({
  results: {},
  length: 0,
  actions: {
    leaveOneOut() {
      console.time('Leave one out');
      const interv = setInterval(
        () => this.set('length', left.reduce((a, b) => a + b)), 30000);
      clearProject()
        .then(() => createFolders())
        .then(() => wavToPRM())
        .delay(50).then(() => normEnergy())
        .delay(50).then(() => normFeatures())
        .delay(50).then(() => createLST())
        .delay(50).then(() => fs.readdirAsync(LSTPath))
        .then(files => threadLeaveOneOut(files))
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          console.timeEnd('Leave one out');
          // console.log(failed);
        });
    },
    leaveOneOutDep() {
      console.time('Leave one out dependent');
      const interv = setInterval(
        () => this.set('length', left.reduce((a, b) => a + b)), 30000);
      clearProject()
        .then(() => wavToPRM())
        .delay(50).then(() => normEnergy())
        .delay(50).then(() => normFeatures())
      // .delay(50).then(() => createLSTDependent());


      clearInterval(interv);
      this.set('length', 0);
      console.timeEnd('Leave one out dependent');
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

import Ember from "ember";
import {
  wavToPRM,
  normEnergy,
  normFeatures,
  wavToPRMConcat,
  copyCommon,
  createFiles,
  normPRM
} from "../../../utils/leave-one-out/wav-to-prm";
import {
  clearProject,
  createFolders,
  clearProject2,
  createFolders2
} from "../../../utils/leave-one-out/remove-common";
import {
  trainUBM,
  trainTotalVariability,
  createUBM,
  createTV
} from "../../../utils/leave-one-out/train-ubm-tv";
import {
  prepareIVectorsExtractor,
  extractIV,
  ivectorExtractor
} from "../../../utils/leave-one-out/extract-iv";
import {
  normalize,
  pldaTraining,
  scorePLDANorm,
  scoreCosine,
  scoreEFR,
  scoreSphNorm,
  normalizePLDA,
  createWCCN,
  scoreCosCat,
  createEFR,
  createSph,
  scorePLDA,
  scoreMahalanobis,
  scoreSph
} from "../../../utils/leave-one-out/scoring-method-leave-one";
import {parseResults} from "../../../utils/parser";
import {computeMean} from "../../../utils/maths-utils";
import {countMean} from "../../../utils/leave-one-out/leave-one-out";
import {
  createLST,
  createDependentLST,
  createDependentNDX
} from "../../../utils/leave-one-out/create-lst";
import {pad} from "../../../utils/pad";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const LSTPath = `${ivectorsPath}/lst`;

const failed = [];
const left = [];
let depClasses = '';

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
      leaveOneProcess(files.splice(0, 5), thread)
        .delay(1000).then(() => {
        files.splice(0, files.length);
        leaveOneOutResolver(files, thread);
      })
        .then(() => resolve());
    }
  });
};

const threadLeaveOneOut = files => {
  const maxThreads = 1;
  const arraysLength = Math.ceil(files.length / maxThreads);
  let threadNum = 0;
  const arrayThreads = [];
  while (files.length) {
    arrayThreads.push(
      leaveOneOutResolver(files.splice(0, arraysLength), ++threadNum));
  }
  return BluebirdPromise.all(arrayThreads);
};

const processConcat = (files, thread, normalize = false) => {
  return new BluebirdPromise(resolve => {
    if (!files.length) {
      resolve();
    } else {
      const current = files.shift();
      return copyCommon(current, thread)
        .then(() => createFiles(current, thread))
        .delay(50).then(() => normPRM(thread))
        .delay(50).then(() => createUBM(thread))
        .delay(50).then(() => createTV(thread))
        .delay(50).then(() => ivectorExtractor(thread, 'ivExtractorMat.ndx'))
        .delay(50).then(() => ivectorExtractor(thread, 'ivExtractor.ndx'))
        .delay(50).then(() => normalizePLDA(thread))
        .delay(50).then(() => createWCCN(current, thread, normalize))
        .delay(50).then(() => createEFR(current, thread, normalize))
        .delay(50).then(() => createSph(current, thread, normalize))
        .delay(50).then(() => scorePLDA(current, thread))
        .then(() => scoreCosCat(current, thread, normalize))
        .then(() => scoreMahalanobis(current, thread, normalize))
        .then(() => scoreSph(current, thread, normalize))
        .then(() => {
          console.log(`DONE : ${current}`);
        })
        .catch((err) => {
          console.log(`ERROR: ${current}`);
          console.log(`ERROR: ${err}`);
          failed.push(current);
        })
        .finally(() => processConcat(files, thread, normalize))
        .then(() => resolve());
    }
  });
};

const resolverConcat = (files, thread, normalize = false) => {
  return new BluebirdPromise(resolve => {
    files = files.concat(failed);
    failed.splice(0, failed.length);
    left[thread || 0] = files.length;
    if (!files.length) {
      resolve();
    } else {
      processConcat(files.splice(0, 5), thread, normalize)
        .delay(1000)
        .then(() => resolverConcat(files, thread, normalize))
        .then(() => resolve());
    }
  });
};

const launchThreads = files => {
  const maxThreads = 8;
  const normalize = false;
  const arraysLength = Math.ceil(files.length / maxThreads);
  let threadNum = 0;
  const arrayThreads = [];
  while (files.length) {
    arrayThreads.push(
      resolverConcat(files.splice(0, arraysLength), ++threadNum, normalize));
  }
  return new BluebirdPromise.all(arrayThreads);
};

const threadConcat = () => {
  let clusters = [];
  const process = [];
  return fs.readdirAsync(`${leaveOnePath}/0_input`)
    .then(dirs => {
      clusters = dirs;
      return BluebirdPromise.map(dirs,
        dir => fs.readdirAsync(`${leaveOnePath}/0_input/${dir}`));
    })
    .then(dirContent => {
      dirContent.forEach((dir, idx) => {
        dir.forEach((file, ndx) => {
          process.push(
            [clusters[idx], file, `${clusters[idx]}-${pad(ndx, 5)}`]);
        });
      });
      return launchThreads(process);
    });
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
        .then(() => wavToPRM(`${leaveOnePath}/0_input`))
        .delay(50).then(() => normEnergy())
        .delay(50).then(() => normFeatures())
        .delay(50).then(() => createLST())
        .delay(50).then(() => fs.readdirAsync(LSTPath))
        .then(files => threadLeaveOneOut(files))
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          console.timeEnd('Leave one out');
        });
    },
    leaveOneOutDependent() {
      console.time('Leave one out dependent');
      const interv = setInterval(
        () => this.set('length', left.reduce((a, b) => a + b)), 30000);
      clearProject()
        .then(() => createFolders())
        // .then(() => wavToPRM(`${leaveOnePath}/0_input`))
        // .delay(50).then(() => normEnergy())
        // .delay(50).then(() => normFeatures())
        .delay(50).then(() => createDependentLST())
        .delay(50)
        .then(inputClasses => {
          depClasses = inputClasses;
          createDependentNDX(depClasses);
        })
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          console.timeEnd('Leave one out dependent');
        });
    },
    leaveOneOutConcat() {
      console.time('Leave one out concat');
      const interv = setInterval(
        () => this.set('length', left.reduce((a, b) => a + b)), 30000);
      clearProject2()
        .then(() => createFolders2())
        .then(() => wavToPRMConcat())
        .delay(3000).then(() => threadConcat())
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          console.timeEnd('Leave one out concat');
        });
    },
    scoreLeaveOneOut() {
      const res = {};
      fs.readdirAsync(`${ivectorsPath}/save_scores`)
        .then(files => BluebirdPromise.map(files,
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
        .then(files => BluebirdPromise.map(files,
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

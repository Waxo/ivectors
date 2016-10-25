import Ember from 'ember';
import {
  wavToPRM,
  normEnergy,
  normFeatures,
  wavToPRMConcat,
  copyCommon,
  createFiles,
  normPRM,
  createDepFiles
} from '../../../utils/leave-one-out/wav-to-prm';
import {
  clearProject,
  createFolders,
  clearProject2,
  createFolders2,
  createCommonLST
} from '../../../utils/leave-one-out/remove-common';
import {
  trainUBM,
  trainTotalVariability,
  createUBM,
  createTV,
  createCommonUBMTV,
  learnDepUBMTV
} from '../../../utils/leave-one-out/train-ubm-tv';
import {
  prepareIVectorsExtractor,
  extractIV,
  ivectorExtractor,
  extractCommonIV,
  extractDepIV
} from '../../../utils/leave-one-out/extract-iv';
import {
  normalize,
  pldaTraining,
  scorePLDANorm,
  scoreCosine,
  scoreEFR,
  scoreSphNorm,
  normalizePLDA,
  createSph,
  scorePLDA,
  scoreSph,
  normalizeDepPLDA,
  scoreDepPLDA
} from '../../../utils/leave-one-out/scoring-method-leave-one';
import {parseResults} from '../../../utils/parser';
import {computeMean} from '../../../utils/maths-utils';
import {
  countMean,
  createConfuseMat,
  csvConfuseMat
} from '../../../utils/leave-one-out/leave-one-out';
import {createLST} from '../../../utils/leave-one-out/create-lst';
import {pad} from '../../../utils/pad';
import {logger} from '../../../utils/logger';

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
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
  logger.log('silly', 'processConcat');
  return new BluebirdPromise(resolve => {
    if (!files.length) {
      resolve();
    } else {
      const current = files.shift();
      return copyCommon(current, thread)
        .then(() => createFiles(current, thread))
        .delay(50).then(() => createUBM(thread, 'ubm.lst'))
        .delay(50).then(() => createTV(thread, 'tv.ndx'))
        .delay(50).then(() => ivectorExtractor(thread, 'ivExtractorMat.ndx'))
        .delay(50).then(() => ivectorExtractor(thread, 'ivExtractor.ndx'))
        .delay(50).then(() => normalizePLDA(thread))
        .delay(50).then(() => createSph(current, thread, normalize))
        .delay(50).then(() => scorePLDA(current, thread))
        .then(() => scoreSph(current, thread, normalize))
        .then(() => {
          logger.log('info', `DONE: ${current}`);
        })
        .catch((err) => {
          logger.log('warn', `Re-queued: ${current} `);
          logger.log('warn', `${err}`);
          failed.push(current);
        })
        .finally(() => processConcat(files, thread, normalize))
        .then(() => resolve());
    }
  });
};

const processDependentConcat = (files, thread, normalize = false) => {
  logger.log('silly', `processDependentConcat`);
  return new BluebirdPromise(resolve => {
    if (!files.length) {
      resolve();
    } else {
      const current = files.shift();
      logger.verbose(current.join(', '));
      return copyCommon(current, thread)
        .then(() => createDepFiles(current, thread))
        .then(() => learnDepUBMTV(current, thread))
        .then(() => extractDepIV(current, thread))
        .then(() => normalizeDepPLDA(thread))
        .then(() => scoreDepPLDA(current, thread))
        .then(() => {
          logger.log('info', `DONE: ${current}`);
        })
        .catch((err) => {
          logger.log('warn', `Re-queued: ${current} `);
          logger.log('warn', `${err}`);
          failed.push(current);
        })
        .finally(() => processDependentConcat(files, thread, normalize))
        .then(() => resolve());
    }
  });
};

const resolverConcat = (files, thread, normalize = false,
  dependent = false) => {
  logger.log('silly', 'resolverConcat');
  return new BluebirdPromise(resolve => {
    files = files.concat(failed);
    failed.splice(0, failed.length);
    left[thread || 0] = files.length;
    if (!files.length) {
      resolve();
    } else {
      if (!dependent) {
        processConcat(files.splice(0, 5), thread, normalize)
          .then(() => {
            return resolverConcat(files, thread, normalize);
          })
          .then(() => resolve());
      } else {
        processDependentConcat(files.splice(0, 5), thread, normalize)
          .then(() => {
            return resolverConcat(files, thread, normalize, dependent);
          })
          .then(() => resolve());
      }
    }
  });
};

const launchThreads = (files, dependent = false) => {
  logger.log('debug', 'launchThreads');
  const maxThreads = 8;
  const normalize = false;
  const arraysLength = Math.ceil(files.length / maxThreads);
  let threadNum = 0;
  const arrayThreads = [];
  while (files.length) {
    arrayThreads.push(
      resolverConcat(files.splice(0, arraysLength), ++threadNum, normalize,
        dependent));
  }
  return new BluebirdPromise.all(arrayThreads);
};

const threadConcat = (dependent = false) => {
  logger.log('debug', 'threadConcat');
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
      return launchThreads(process, dependent);
    });
};

export default Ember.Component.extend({
  results: {},
  length: 0,
  prmInput: true,
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
    leaveOneOutConcat() {
      logger.log('info', 'leaveOneOutConcat');
      console.time('Leave one out concat');
      const interv = setInterval(
        () => this.set('length', left.reduce((a, b) => a + b)), 30000);
      clearProject2()
        .then(() => createFolders2())
        .then(() => wavToPRMConcat(this.get('prmInput'), '0_input'))
        .delay(10000).then(() => normPRM())
        .then(() => threadConcat())
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          logger.log('info', 'Done : leaveOneOutConcat');
          console.timeEnd('Leave one out concat');
        });
    },
    leaveOneOutDependentCat() {
      logger.log('info', 'leaveOneOutDependentCat');
      console.time('Leave one out dependent concat');
      const interv = setInterval(() => {
        if (left.length !== 0) {
          this.set('length', left.reduce((a, b) => a + b));
        }
      }, 30000);
      clearProject2()
        .then(() => createFolders2())
        .then(() => wavToPRMConcat(false, '0_input'))
        .delay(10000).then(() => normPRM())
        .then(() => createCommonLST('0_input'))
        .then(() => createCommonUBMTV())
        .then(() => extractCommonIV())
        .delay(10000).then(() => threadConcat(true))
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          logger.log('info', 'Done: leaveOneOutDependentCat');
          console.timeEnd('Leave one out dependent concat');
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
          console.log(scores);
          scores.forEach(score => {
            for (const key in score) {
              if (score.hasOwnProperty(key)) {
                res[key] = score[key];
              }
            }
          });
          console.log(res);
          this.set('results', countMean(res));
        });
    },
    confuseMatrix() {
      logger.log('silly', 'confuseMatrix');
      fs.readdirAsync(`${ivectorsPath}/save_scores`)
        .then(files => BluebirdPromise.map(files,
          file => parseResults(`${ivectorsPath}/save_scores/${file}`)))
        .then(scores => createConfuseMat(scores))
        .then(confuseMat => csvConfuseMat(confuseMat, this.get('csvName')))
        .then(() => logger.log('info', 'confuseMatrix Created'));
    }
  }
});

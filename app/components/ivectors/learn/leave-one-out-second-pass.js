import Ember from 'ember';
import {logger} from '../../../utils/logger';
import {
  aggregateClusters
} from '../../../utils/leave-one-out/second-pass/aggregate-clusters';
import {
  clearProject3,
  createFolders3
} from '../../../utils/leave-one-out/remove-common';
import {
  retrieveWinners,
  createList
} from '../../../utils/leave-one-out/second-pass/retrieve-winners';
import {
  wavToPRMConcat,
  copyCommon,
  createFiles,
  normPRM
} from '../../../utils/leave-one-out/wav-to-prm';
import {createUBM, createTV} from '../../../utils/leave-one-out/train-ubm-tv';
import {ivectorExtractor} from '../../../utils/leave-one-out/extract-iv';
import {
  normalizePLDA,
  createSph,
  scorePLDA,
  scoreSph
} from '../../../utils/leave-one-out/scoring-method-leave-one';

const BluebirdPromise = require('bluebird');

const inputDirName = '2_secondPass';
const inputPRMName = '3_secondPassPRM';

const failed = [];
const left = [];

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
        .delay(50).then(() => scorePLDA(current, thread, 'scores_p2_PldaNorm'))
        .then(() => scoreSph(current, thread, normalize, 'scores_p2_sphNorm'))
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

const resolverConcat = (files, thread, normalize = false) => {
  logger.log('silly', 'resolverConcat');
  return new BluebirdPromise(resolve => {
    files = files.concat(failed);
    failed.splice(0, failed.length);
    left[thread || 0] = files.length;
    if (!files.length) {
      resolve();
    } else {
      processConcat(files.splice(0, 5), thread, normalize)
        .then(() => {
          return resolverConcat(files, thread, normalize);
        })
        .then(() => resolve());
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

export default Ember.Component.extend({
  regroupingName: 'Human',
  prmInput: true,
  actions: {
    leaveOneOut() {
      logger.log('debug', 'leaveOneOut 2nd pass');
      console.time('Leave one out 2nd pass');
      const interv = setInterval(
        () => this.set('length', left.reduce((a, b) => a + b)), 30000);
      const regroupingName = this.get('regroupingName');
      aggregateClusters(regroupingName)
        .then(() => clearProject3())
        .then(() => createFolders3())
        .then(() => wavToPRMConcat(this.get('prmInput'), inputDirName,
          inputPRMName))
        .delay(10000).then(() => normPRM())
        .then(() => retrieveWinners(regroupingName))
        .then(recognizedList => createList(regroupingName, recognizedList))
        .then(testList => launchThreads(testList))
        .then(() => {
          clearInterval(interv);
          this.set('length', 0);
          logger.log('info', 'Done : leaveOneOut 2nd pass');
          console.timeEnd('Leave one out 2nd pass');
        });
    }
  }
});

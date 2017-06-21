const fork = require('child_process').fork;
const numCPUs = require('os').cpus().length;
const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');
const {bin} = require('../../config/environment');
const {execAsync} = require('../utils/exec-async');
const {workbenchCreator} = require('../../config/environment');
const {logger} = require('../utils/logger');

const normPRM = (layer, wbFold) => {
  const featNormPRM = [
    bin.normPRM,
    `--config ${layer.cfg.normPRM}`,
    `--inputFeatureFilename ${layer.paths.lRoot}/normPRM.lst`,
    `--featureFilesPath ${wbFold.prm}/`,
    `--labelFilesPath ${layer.paths.lbl}/`
  ];

  return execAsync(featNormPRM.join(' '));
};

const createUBM = (layer, wbFold) => {
  return fs.ensureDir(wbFold.gmm)
    .then(() => {
      const ubmExec = [
        bin.ubm,
        `--config ${layer.cfg.ubm}`,
        `--inputFeatureFilename ${wbFold.files}/data.lst`,
        `--featureFilesPath ${wbFold.prm}/`,
        `--labelFilesPath ${layer.paths.lbl}/`,
        `--mixtureFilesPath ${wbFold.gmm}/`
      ];

      return execAsync(ubmExec.join(' '));
    });
};

const createTV = (layer, wbFold) => {
  const tvExec = [
    bin.tv,
    `--config ${layer.cfg.tv}`,
    `--featureFilesPath ${wbFold.prm}/`,
    `--labelFilesPath ${layer.paths.lbl}/`,
    `--mixtureFilesPath ${wbFold.gmm}/`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--ndxFilename ${wbFold.files}/tv.ndx`
  ];

  return fs.ensureDir(wbFold.mat)
    .then(() => {
      return execAsync(tvExec.join(' '));
    });
};

const ivExtractor = (layer, wbFold, ndxFile) => {
  const ivExtract = [
    bin.ivExtractor,
    `--config ${layer.cfg.ivExtractor}`,
    `--featureFilesPath ${wbFold.prm}/`,
    `--labelFilesPath ${layer.paths.lbl}/`,
    `--mixtureFilesPath ${wbFold.gmm}/`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--saveVectorFilesPath ${wbFold.ivRaw}/`,
    `--targetIdList ${wbFold.files}/${ndxFile}`
  ];

  return fs.ensureDir(wbFold.ivRaw)
    .then(() => execAsync(ivExtract.join(' ')));
};

const normalizePLDA = (layer, wbFold) => {
  const normPLDA = [
    bin.ivNorm,
    `--config ${layer.cfg.normPLDA}`,
    `--saveVectorFilesPath ${wbFold.ivLenNorm}/`,
    `--loadVectorFilesPath ${wbFold.ivRaw}/`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--backgroundNdxFilename ${wbFold.files}/Plda.ndx`,
    `--inputVectorFilename ${layer.paths.lRoot}/all.lst`
  ];
  return fs.ensureDir(wbFold.ivLenNorm)
    .then(() => execAsync(normPLDA.join(' ')));
};

const scoring_ = (cfg, wbFold) => {
  const outputName = `${cfg.name}.txt`;
  const outDir = (cfg.output) ? `${cfg.output}/${outputName}` :
    '/dev/null';
  const ivInputPath = (cfg.norm) ? wbFold.ivLenNorm : wbFold.ivRaw;
  const ndxInput = `${wbFold.files}/${cfg.ndxFile}`;

  const score = [
    bin.ivTest,
    `--config ${cfg.configFile}`,
    `--testVectorFilesPath ${ivInputPath}`,
    `--loadVectorFilesPath ${ivInputPath}`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--outputFilename ${outDir}`,
    `--backgroundNdxFilename ${wbFold.files}/Plda.ndx`,
    `--targetIdList ${wbFold.files}/TrainModel.ndx`,
    `--ndxFilename ${ndxInput}`
  ];

  return execAsync(score.join(' '));
};

const createSph = (layer, wbFold) => {
  return scoring_({
    configFile: layer.cfg.sph,
    ndxFile: 'ivTestMat.ndx',
    norm: false
  }, wbFold);
};

const trainPLDA = (layer, wbFold) => {
  const train = [
    bin.plda,
    `--config ${layer.cfg.plda}`,
    `--testVectorFilesPath ${wbFold.ivLenNorm}/`,
    `--loadVectorFilesPath ${wbFold.ivLenNorm}/`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--backgroundNdxFilename ${wbFold.files}/Plda.ndx`
  ];

  return execAsync(train.join(' '));
};

const scoreSph = wbFold => {
  return fs.ensureDir(wbFold.scores.sph)
    .then(() => scoring_({
      name: wbFold.fold,
      configFile: wbFold.cfg.sph,
      output: wbFold.scores.sph,
      ndxFile: `ivTest.ndx`,
      norm: false
    }, wbFold));
};

const scorePLDA = wbFold => {
  return fs.ensureDir(wbFold.scores.plda)
    .then(() => scoring_({
      name: wbFold.fold,
      configFile: wbFold.cfg.plda,
      output: wbFold.scores.plda,
      ndxFile: `ivTest.ndx`,
      norm: true
    }, wbFold));
};

const createWorkbenches = layer => {
  const workbenchList = [];
  for (let i = 0; i < 10; i++) {
    workbenchList.push(workbenchCreator(layer, i));
  }
  return workbenchList;
};

const launchIvProcess = (layer, workbenches, dnnScorer = true) => {
  const childrenPromises = [];
  let wbIndex = 0;

  for (let i = 0; i < numCPUs; i++) {
    const child = fork(`${process.cwd()}/app/learn/iv-process-threads.js`);

    childrenPromises.push(new BluebirdPromise(resolve => {
      child.on('message', msg => {
        switch (msg.type) {
          case 'ready':
            if (wbIndex >= workbenches.length) {
              child.send({type: 'terminate'});
            } else {
              child.send({
                type: 'data',
                workbench: workbenches[wbIndex++],
                layer,
                dnnScorer
              });
            }
            break;
          /* istanbul ignore next */
          default:
            logger.log('error', `Master: Message not recognized : ${msg.type}`);
            break;
        }
      });

      child.on('exit', () => {
        resolve();
      });
    }));
  }

  return BluebirdPromise.all(childrenPromises);
};

module.exports = {
  normPRM,
  createUBM,
  createTV,
  ivExtractor,
  normalizePLDA,
  createSph,
  trainPLDA,
  scoreSph,
  scorePLDA,
  createWorkbenches,
  launchIvProcess
};

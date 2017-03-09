const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {bin} = require('../../config/environment');
const {execAsync} = require('../utils/exec-async');

const normPRM = layer => {
  const featNormPRM = [
    bin.normPRM,
    `--config ${layer.cfg.normPRM}`,
    `--inputFeatureFilename ${layer.paths.lRoot}/all.lst`,
    `--featureFilesPath ${layer.paths.prm}/`,
    `--labelFilesPath ${layer.paths.lbl}/`
  ];

  return execAsync(featNormPRM.join(' '));
};

const createUBM = (layer, wbFold) => {
  return fs.ensureDirAsync(wbFold.gmm)
    .then(() => {
      const ubmExec = [
        bin.ubm,
        `--config ${layer.cfg.ubm}`,
        `--inputFeatureFilename ${wbFold.files}/data.lst`,
        `--featureFilesPath ${layer.paths.prm}/`,
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
    `--featureFilesPath ${layer.paths.prm}/`,
    `--labelFilesPath ${layer.paths.lbl}/`,
    `--mixtureFilesPath ${wbFold.gmm}/`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--ndxFilename ${wbFold.files}/tv.ndx`
  ];

  return fs.ensureDirAsync(wbFold.mat)
    .then(() => {
      return execAsync(tvExec.join(' '));
    });
};

const ivExtractor = (layer, wbFold, ndxFile) => {
  const ivExtract = [
    bin.ivExtractor,
    `--config ${layer.cfg.ivExtractor}`,
    `--featureFilesPath ${layer.paths.prm}/`,
    `--labelFilesPath ${layer.paths.lbl}/`,
    `--mixtureFilesPath ${wbFold.gmm}/`,
    `--matrixFilesPath ${wbFold.mat}/`,
    `--saveVectorFilesPath ${wbFold.ivRaw}/`,
    `--targetIdList ${wbFold.files}/${ndxFile}`
  ];

  return fs.ensureDirAsync(wbFold.ivRaw)
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
  return fs.ensureDirAsync(wbFold.ivLenNorm)
    .then(() => execAsync(normPLDA.join(' ')));
};

module.exports = {normPRM, createUBM, createTV, ivExtractor, normalizePLDA};

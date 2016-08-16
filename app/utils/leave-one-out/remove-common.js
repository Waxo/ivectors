import {logger} from "../logger";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const commonPath = `${leaveOnePath}/common`;

const clearProject = () => {
  const clean = [
    `${ivectorsPath}/prm`,
    `${ivectorsPath}/lbl`,
    `${leaveOnePath}/ndx`,
    `${leaveOnePath}/gmm`,
    `${leaveOnePath}/mat`,
    `${leaveOnePath}/iv`,
    `${commonPath}`,
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`,
    `${ivectorsPath}/all.lst`,
    `${ivectorsPath}/data.lst`,
    `${ivectorsPath}/matWCCN.matx`,
    `${ivectorsPath}/Plda.ndx`,
    `${ivectorsPath}/TrainModel.ndx`
  ];

  return BluebirdPromise.map(clean, item => fs.removeAsync(item));
};

const createFolders = () => {
  const folders = [
    `${ivectorsPath}/prm`,
    `${ivectorsPath}/lbl`,
    `${leaveOnePath}/ndx`,
    `${leaveOnePath}/gmm`,
    `${leaveOnePath}/mat`,
    `${leaveOnePath}/iv`,
    `${commonPath}/lst`,
    `${commonPath}/ndx`,
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`
  ];

  return BluebirdPromise.map(folders, folder => fs.mkdirsAsync(folder));
};

const clearProject2 = () => {
  const clean = [
    `${commonPath}`,
    `${leaveOnePath}/threads`,
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`
  ];

  return BluebirdPromise.map(clean, item => fs.removeAsync(item));
};

const createFolders2 = () => {
  const folders = [
    `${commonPath}/clusters`,
    `${commonPath}/wav`,
    `${commonPath}/prm`,
    `${commonPath}/lbl`,
    `${commonPath}/gmm`,
    `${commonPath}/mat`,
    `${commonPath}/lst`,
    `${commonPath}/iv/raw`,
    `${commonPath}/iv/lengthNorm`,
    `${commonPath}/ivTest`,
    `${commonPath}/scores`,
    `${leaveOnePath}/threads`,
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`
  ];

  return BluebirdPromise.map(folders, folder => fs.mkdirsAsync(folder));
};

const createCommonLST = () => {
  logger.log('debug', 'createCommonDependent');
  let clusters = [];
  return fs.readdirAsync(`${leaveOnePath}/0_input`)
    .then(dirs => {
      clusters = dirs;
      return BluebirdPromise.map(dirs,
        dir => fs.readdirAsync(`${leaveOnePath}/0_input/${dir}`));
    })
    .then(dirContent => BluebirdPromise.map(dirContent,
      (cluster, idx) => fs.writeFileAsync(
        `${commonPath}/lst/${clusters[idx]}.lst`,
        cluster.join('\n').replace(/\.wav/g, ''))));
};



export {
  clearProject,
  createFolders,
  clearProject2,
  createFolders2,
  createCommonLST
};

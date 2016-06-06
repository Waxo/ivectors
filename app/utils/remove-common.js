const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;

const clearProject = () => {
  const clean = [
    `${ivectorsPath}/prm`,
    `${ivectorsPath}/lbl`,
    `${leaveOnePath}/ndx`,
    `${leaveOnePath}/gmm`,
    `${leaveOnePath}/mat`,
    `${leaveOnePath}/iv`,
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
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`
  ];

  return BluebirdPromise.map(folders, folder => fs.mkdirAsync(folder));
};

export {clearProject, createFolders};

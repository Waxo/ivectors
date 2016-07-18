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
    `${leaveOnePath}/common`,
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
    `${leaveOnePath}/common/lst`,
    `${leaveOnePath}/common/ndx`,
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`
  ];

  return BluebirdPromise.map(folders, folder => fs.mkdirsAsync(folder));
};

const clearProject2 = () => {
  const clean = [
    `${leaveOnePath}/common`,
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
    `${leaveOnePath}/common/clusters`,
    `${leaveOnePath}/common/wav`,
    `${leaveOnePath}/common/prm`,
    `${leaveOnePath}/common/lbl`,
    `${leaveOnePath}/threads`,
    `${ivectorsPath}/scores_PldaNorm`,
    `${ivectorsPath}/scores_wccn`,
    `${ivectorsPath}/scores_mahalanobis`,
    `${ivectorsPath}/scores_sphNorm`
  ];

  return BluebirdPromise.map(folders, folder => fs.mkdirsAsync(folder));
};

export {clearProject, createFolders, clearProject2, createFolders2};

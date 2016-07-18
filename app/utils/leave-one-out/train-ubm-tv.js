import {execAsync} from "../exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const gmmPath = `${leaveOnePath}/gmm`;
const matrixPath = `${leaveOnePath}/mat`;
const ndxPath = `${leaveOnePath}/ndx`;

const cleanGMM = (thread = '') => {
  return fs.removeAsync(`${gmmPath}/${thread}`)
    .then(() => fs.mkdirAsync(`${gmmPath}/${thread}`));
};

const cleanTV = (thread = '') => {
  return fs.removeAsync(`${matrixPath}/${thread}`)
    .then(() => fs.mkdirAsync(`${matrixPath}/${thread}`));
};

const trainUBM = (inputFile, thread = '') => {
  console.log(`Train UBM ${inputFile} Thread : ${thread}`);
  return cleanGMM(thread).then(() => {
    let command = `${leaveOnePath}/exe/02_TrainWorld`;
    let options = [
      `--config ${leaveOnePath}/cfg/02_UBM_TrainWorld.cfg`,
      `--inputFeatureFilename ${ivectorsPath}/lst/${inputFile}`,
      `--featureFilesPath ${prmPath}/`,
      `--labelFilesPath ${lblPath}`,
      `--mixtureFilesPath ${gmmPath}/${thread}/`
    ];

    let execute = `${command} ${options.join(' ')}`;
    return execAsync(execute);
  });
};

const trainTotalVariability = (inputFile, thread = '') => {
  console.log(`Train TV`);
  return fs.removeAsync(`${ndxPath}/totalvariability${thread}.ndx`)
    .then(() => {
      fs.createReadStream(`${ivectorsPath}/lst/${inputFile}`)
        .pipe(fs.createWriteStream(`${ndxPath}/totalvariability${thread}.ndx`));
      return cleanTV(thread);
    })
    .then(() => {
      let command = `${leaveOnePath}/exe/03_TotalVariability`;
      let options = [
        `--config ${leaveOnePath}/cfg/03_TV_TotalVariability_fast.cfg`,
        `--featureFilesPath ${prmPath}/`,
        `--labelFilesPath ${lblPath}/`,
        `--mixtureFilesPath ${gmmPath}/${thread}/`,
        `--matrixFilesPath ${matrixPath}/${thread}/`,
        `--ndxFilename ${ndxPath}/totalvariability${thread}.ndx`
      ];

      let execute = `${command} ${options.join(' ')}`;
      return execAsync(execute);
    });
};

const createUBM = thread => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  const ubm = [
    `${leaveOnePath}/exe/02_TrainWorld`,
    `--config ${leaveOnePath}/cfg/02_UBM_TrainWorld.cfg`,
    `--inputFeatureFilename ${threadPath}/ubm.lst`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/`
  ];

  return execAsync(ubm.join(' '));
};

const createTV = thread => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  const tv = [
    `${leaveOnePath}/exe/03_TotalVariability`,
    `--config ${leaveOnePath}/cfg/03_TV_TotalVariability_fast.cfg`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/`,
    `--matrixFilesPath ${threadPath}/mat/`,
    `--ndxFilename ${threadPath}/tv.ndx`
  ];

  return execAsync(tv.join(' '));
};

export {trainUBM, trainTotalVariability, createUBM, createTV};

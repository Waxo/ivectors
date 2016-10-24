import {execAsync} from "../exec-async";
import {logger} from "../logger";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const commonPath = `${leaveOnePath}/common`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
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

const createUBM = (thread, lstFile, cluster = '') => {
  logger.log('silly', 'createUBM');
  const threadPath = (thread !== 'common') ?
    `${leaveOnePath}/threads/${thread}` : `${commonPath}`;

  const ubm = [
    `${leaveOnePath}/exe/02_TrainWorld`,
    `--config ${leaveOnePath}/cfg/02_UBM_TrainWorld.cfg`,
    `--inputFeatureFilename ${threadPath}/${lstFile}`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/${cluster}`
  ];

  return execAsync(ubm.join(' '), true);
};

const createTV = (thread, ndxFile, cluster = '') => {
  logger.log('silly', 'createTV');
  const threadPath = (thread !== 'common') ?
    `${leaveOnePath}/threads/${thread}` : `${commonPath}`;

  const tv = [
    `${leaveOnePath}/exe/03_TotalVariability`,
    `--config ${leaveOnePath}/cfg/03_TV_TotalVariability_fast.cfg`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/${cluster}`,
    `--matrixFilesPath ${threadPath}/mat/${cluster}`,
    `--ndxFilename ${threadPath}/${ndxFile}`
  ];

  return execAsync(tv.join(' '));
};

const createCommonUBMTV = () => {
  logger.log('debug', 'createCommonUBMTV');
  return fs.copyAsync(`${commonPath}/lst`, `${commonPath}/ndx`)
    .delay(50).then(() => fs.readdirAsync(`${commonPath}/ndx`))
    .then(ndxFiles => BluebirdPromise.map(ndxFiles,
      ndx => fs.moveAsync(`${commonPath}/ndx/${ndx}`,
        `${commonPath}/ndx/${ndx.replace('.lst', '.ndx')}`)))
    .then(() => fs.readdirAsync(`${commonPath}/lst`))
    .then(files => {
      return BluebirdPromise.map(files,
        cluster => {
          const current = cluster.replace('.lst', '');
          return fs.mkdirsAsync(`${commonPath}/gmm/${current}`)
            .then(fs.mkdirsAsync(`${commonPath}/mat/${current}`))
            .then(() => createUBM('common', `lst/${cluster}`, `${current}/`))
            .delay(50).then(
              () => createTV('common', `ndx/${current}.ndx`, `${current}/`));
        });
    });
};

const learnDepUBMTV = (file, thread) => {
  logger.log('silly', 'learnDepUBMTV');
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  return fs.removeAsync(`${threadPath}/gmm/${file[0]}`)
    .then(() => fs.removeAsync(`${threadPath}/mat/${file[0]}`))
    .then(() => fs.mkdirsAsync(`${threadPath}/gmm/${file[0]}`))
    .then(() => fs.mkdirsAsync(`${threadPath}/mat/${file[0]}`))
    .then(() => createUBM(thread, `lst/${file[0]}.lst`, `${file[0]}/`))
    .then(() => createTV(thread, `ndx/${file[0]}.ndx`, `${file[0]}/`));
};

export {
  trainUBM,
  trainTotalVariability,
  createUBM,
  createTV,
  createCommonUBMTV,
  learnDepUBMTV
};

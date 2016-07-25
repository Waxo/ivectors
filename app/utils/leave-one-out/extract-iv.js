import {execAsync} from "../exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = require("wav-file-info");

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const gmmPath = `${leaveOnePath}/gmm`;
const matrixPath = `${leaveOnePath}/mat`;
const iv = `${leaveOnePath}/iv/`;
const ndxPath = `${leaveOnePath}/ndx`;

const cleanIV = (thread = '') => {
  return fs.removeAsync(`${iv}${thread}`)
    .then(() => fs.mkdirsAsync(`${iv}${thread}/raw`));
};

const pad = function (num, size) {
  let s = num + '';
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
};

const prepareIVectorsExtractor = (currentName, newName, thread = '') => {
  console.log('Prepare IV');
  currentName = currentName.replace('.lst', '');
  return fs.readFileAsync(`${ivectorsPath}/data.lst`)
    .then(data => {
      data = data.toString().split('\n');
      let ndx = '';
      let plda = '';
      let trainModel = '';
      let currentClass = '';
      let index = 0;
      data.forEach(line => {
        if (line) {
          let [className, fileName] = line.split('/');
          if (currentClass !== className) {
            currentClass = className;
            index = 0;
            if (plda) {
              plda += '\n';
            }
          }
          const filename = `${className}-${pad(index++, 5)}`;
          ndx += `${filename} ${line}` + '\n';
          if (fileName !== currentName) {
            plda += `${filename} `;
            trainModel += `${filename} ${filename}` + '\n';
          } else {
            newName.name = filename;
          }
        }
      });
      fs.writeFileSync(`${ndxPath}/Plda${thread}.ndx`, plda);
      fs.writeFileSync(`${ndxPath}/TrainModel${thread}.ndx`, trainModel);
      return fs.writeFileAsync(`${ndxPath}/ivExtractor${thread}.ndx`, ndx);
    });
};

const extractIV = (thread = '') => {
  console.log('Extract IVectors');
  return cleanIV(thread)
    .then(() => {
      let command = `${leaveOnePath}/exe/04_IvExtractor`;
      let options = [
        `--config ${leaveOnePath}/cfg/04_ivExtractor_fast.cfg`,
        `--featureFilesPath ${prmPath}/`,
        `--labelFilesPath ${lblPath}/`,
        `--mixtureFilesPath ${gmmPath}/${thread}/`,
        `--matrixFilesPath ${matrixPath}/${thread}/`,
        `--saveVectorFilesPath ${iv}${thread}/raw/`,
        `--targetIdList ${ndxPath}/ivExtractor${thread}.ndx`
      ];

      let execute = `${command} ${options.join(' ')}`;
      return execAsync(execute);
    });
};

const ivectorExtractor = (thread, list) => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;

  const ivExtractor = [
    `${leaveOnePath}/exe/04_IvExtractor`,
    `--config ${leaveOnePath}/cfg/04_ivExtractor_fast.cfg`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/`,
    `--matrixFilesPath ${threadPath}/mat/`,
    `--saveVectorFilesPath ${threadPath}/iv/raw/`,
    `--targetIdList ${threadPath}/${list}`
  ];

  return execAsync(ivExtractor.join(' '));
};

const createTest = (file, thread) => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;

  const prm = [
    `${leaveOnePath}/exe/00_sfbcep`,
    '-F PCM16 -p 19 -e -D -A',
    `${leaveOnePath}/0_input/${file[0]}/${file[1]}`,
    `${threadPath}/test/prm/${file[1].replace('wav', 'prm')}`
  ];

  const enerNorm = [
    `${leaveOnePath}/exe/01_NormFeat`,
    `--config ${leaveOnePath}/cfg/00_PRM_NormFeat_energy.cfg`,
    `--inputFeatureFilename ${threadPath}/test/data.lst`,
    `--featureFilesPath ${threadPath}/test/prm/`,
    `--labelFilesPath ${threadPath}/test/lbl/`
  ];

  const featNorm = [
    `${leaveOnePath}/exe/01_NormFeat`,
    `--config ${leaveOnePath}/cfg/01_PRM_NormFeat.cfg`,
    `--inputFeatureFilename ${threadPath}/test/data.lst`,
    `--featureFilesPath ${threadPath}/test/prm/`,
    `--labelFilesPath ${threadPath}/test/lbl/`
  ];

  const ivExtractor = [
    `${leaveOnePath}/exe/04_IvExtractor`,
    `--config ${leaveOnePath}/cfg/04_ivExtractor_fast.cfg`,
    `--featureFilesPath ${threadPath}/test/prm/`,
    `--labelFilesPath ${threadPath}/test/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/`,
    `--matrixFilesPath ${threadPath}/mat/`,
    `--saveVectorFilesPath ${threadPath}/iv/raw/`,
    `--targetIdList ${threadPath}/test/ivExtractor.ndx`
  ];

  return new BluebirdPromise(resolve => {
    wavFileInfo.infoByFilename(`${leaveOnePath}/0_input/${file[0]}/${file[1]}`,
      (err, info) => {
        let line = `0 ${info.duration} sound`;
        fs.writeFileAsync(
          `${threadPath}/test/lbl/${file[1].replace('wav', 'lbl')}`, line)
          .then(() => resolve());
      });
  })
    .then(() => execAsync(prm.join(' ')))
    .delay(50).then(() => execAsync(enerNorm.join(' ')))
    .delay(50).then(() => execAsync(featNorm.join(' ')))
    .delay(50).then(() => execAsync(ivExtractor.join(' ')));
};

export {prepareIVectorsExtractor, extractIV, ivectorExtractor, createTest};

import {execAsync} from "../exec-async";
import {logger} from "../logger";
import {pad} from '../pad';

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = require("wav-file-info");

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const commonPath = `${leaveOnePath}/common`;
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
      return fs.writeFileAsync(`${ndxPath}/ivExtractor${thread}.ndx`, ndx)
        .then(() => fs.writeFileAsync(`${ndxPath}/Plda${thread}.ndx`, plda))
        .then(() => fs.writeFileAsync(`${ndxPath}/TrainModel${thread}.ndx`,
          trainModel));
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

const ivectorExtractor = (thread, ndxFile, cluster = '') => {
  logger.log('silly', 'ivectorExtractor');
  const threadPath = (thread !== 'common') ?
    `${leaveOnePath}/threads/${thread}` : `${commonPath}`;

  const ivExtractor = [
    `${leaveOnePath}/exe/04_IvExtractor`,
    `--config ${leaveOnePath}/cfg/04_ivExtractor_fast.cfg`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`,
    `--mixtureFilesPath ${threadPath}/gmm/${cluster}`,
    `--matrixFilesPath ${threadPath}/mat/${cluster}`,
    `--saveVectorFilesPath ${threadPath}/iv/raw/${cluster}`,
    `--targetIdList ${threadPath}/${ndxFile}`
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

const extractCommonIV = () => {
  logger.log('debug', 'extractCommonIV');
  let clusters = [];
  return fs.readdirAsync(`${commonPath}/lst`)
    .then(files => {
      clusters = files.map(a => a.replace('.lst', ''));
      return BluebirdPromise.map(files,
        file => fs.readFileAsync(`${commonPath}/lst/${file}`));
    })
    .then(readFiles => {
      return BluebirdPromise.map(readFiles, (buffer, idx) => {
        buffer = buffer.toString().split('\n');
        return fs.writeFileAsync(
          `${commonPath}/ndx/ivExMat-${clusters[idx]}.ndx`,
          buffer.map(a => `${a} ${a}`).join('\n'))
          .then(() => fs.writeFileAsync(
            `${commonPath}/ndx/ivEx-${clusters[idx]}.ndx`,
            `${clusters[idx]} ${buffer.join(' ')}`))
          .then(() => fs.writeFileAsync(
            `${commonPath}/ivTest/ivTestMat-${clusters[idx]}.ndx`,
            `<replace> ${buffer.join(' ')}`))
          .then(() => fs.writeFileAsync(
            `${commonPath}/ivTest/ivTest-${clusters[idx]}.ndx`,
            `<replace> ${clusters[idx]}`))
          .then(() => fs.writeFileAsync(
            `${commonPath}/ndx/Plda-${clusters[idx]}.ndx`, buffer.join(' ')));
      });
    })
    .then(() => BluebirdPromise.map(clusters, cluster =>
      fs.mkdirsAsync(`${commonPath}/iv/raw/${cluster}`)
        .then(() => fs.mkdirsAsync(`${commonPath}/iv/raw/${cluster}`))
        .then(() => ivectorExtractor('common',
          `ndx/ivExMat-${cluster}.ndx`, `${cluster}/`))
        .then(() => ivectorExtractor('common',
          `ndx/ivEx-${cluster}.ndx`, `${cluster}/`)))
    );
};

const extractDepIV = (file, thread) => {
  logger.log('silly', 'extractDepIV');
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  return fs.removeAsync(`${threadPath}/iv/raw/${file[0]}`)
    .then(() => fs.mkdirsAsync(`${threadPath}/iv/raw/${file[0]}`))
    .then(
      () => ivectorExtractor(thread, `ndx/ivEx-${file[0]}.ndx`, `${file[0]}/`))
    .then(() => ivectorExtractor(thread, `ndx/ivExMat-${file[0]}.ndx`,
      `${file[0]}/`))
    .then(() => fs.writeFileAsync(`${threadPath}/ivExGlob.ndx`,
      `${file[2]} ${file[2]}` + '\n'))
    .then(() => fs.readdirAsync(`${threadPath}/gmm`))
    .then(clusters => BluebirdPromise.map(clusters,
      cluster => ivectorExtractor(thread, 'ivExGlob.ndx', `${cluster}/`)));
};

export {
  prepareIVectorsExtractor,
  extractIV,
  ivectorExtractor,
  extractCommonIV,
  createTest,
  extractDepIV
};

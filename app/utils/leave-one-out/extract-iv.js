import {execAsync} from "../exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

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

export {prepareIVectorsExtractor, extractIV};

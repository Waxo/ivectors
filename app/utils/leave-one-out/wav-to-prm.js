import SPro from '../../ivectors/0_1_Prepare_PRM/Spro';
import {execAsync} from "../exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = BluebirdPromise.promisifyAll(require('wav-file-info'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const commonPath = `${leaveOnePath}/common`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;

const wavToPRMConcat = () => {
  const clusters = [];
  return fs.readdirAsync(`${leaveOnePath}/0_input`)
    .then(dirs =>
      BluebirdPromise.map(dirs,
        dir => {
          clusters.push([dir, []]);
          return fs.readdirAsync(`${leaveOnePath}/0_input/${dir}`);
        }))
    .then(filesInDirs => {
      filesInDirs.forEach((fileList, idx) => {
        clusters[idx][1] = fileList;
      });
      return BluebirdPromise.map(clusters,
        cluster => BluebirdPromise.map(cluster[1], file => {
          const command = [
            `${leaveOnePath}/exe/00_sfbcep`,
            '-F PCM16 -p 19 -e -D -A',
            `${leaveOnePath}/0_input/${cluster[0]}/${file}`,
            `${commonPath}/prm/${file.replace('wav', 'prm')}`
          ];
          return execAsync(command.join(' '))
            .then(() => wavFileInfo.infoByFilenameAsync(
              `${leaveOnePath}/0_input/${cluster[0]}/${file}`))
            .then(info => fs.writeFileAsync(
              `${commonPath}/lbl/${file.replace('wav', 'lbl')}`,
              `0 ${info.duration} sound`));
        })
      );
    })
    .then(() => fs.writeFileAsync(`${commonPath}/data.lst`,
      clusters.map(f => f[1].join('\n').replace(/\.wav/g, '')).join('\n')
    ))
    .then(() => {
      const ivExtractor = [];
      let ivExtractorMat = [];
      const Plda = [];
      let ivTest = '<replace>';
      clusters.forEach((cluster, idx) => {
        ivExtractorMat = ivExtractorMat.concat(cluster[1]);
        ivExtractor[idx] =
          `${cluster[0]} ${cluster[1].join(' ').replace(/\.wav/g, '')}`;
        Plda[idx] = cluster[1].join(' ').replace(/\.wav/g, '');
        ivTest += ` ${cluster[0]}`;
      });
      return fs.writeFileAsync(`${commonPath}/ivExtractorMat.ndx`,
        ivExtractorMat.map(c => {
          c = c.replace('.wav', '');
          return `${c} ${c}`;
        }).join('\n'))
        .then(() => fs.writeFileAsync(`${commonPath}/ivExtractor.ndx`,
          ivExtractor.join('\n')))
        .then(() => fs.writeFileAsync(`${commonPath}/Plda.ndx`,
          Plda.join('\n')))
        .then(() => fs.writeFileAsync(`${commonPath}/ivTest.ndx`, ivTest))
        .then(() => fs.writeFileAsync(`${commonPath}/ivTestMat.ndx`,
          `<replace> ${ivExtractorMat.join(' ').replace(/\.wav/g, '')}`));
    });
};

const copyCommon = (file, thread) => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  return fs.removeAsync(threadPath)
    .delay(50).finally(() => fs.copyAsync(commonPath, threadPath));
};

const createFiles = (file, thread) => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  const ivName = file[1].replace('.wav', '');
  return BluebirdPromise.map([
      `${threadPath}/gmm`,
      `${threadPath}/mat`,
      `${threadPath}/iv/raw`,
      `${threadPath}/iv/lengthNorm`
    ],
    dir => fs.mkdirsAsync(dir))
    .then(() => fs.readFileAsync(`${threadPath}/data.lst`))
    .then(buffer => fs.writeFileAsync(`${threadPath}/ubm.lst`,
      buffer.toString().replace(ivName + '\n', '')))
    .then(() => fs.copyAsync(`${threadPath}/ubm.lst`, `${threadPath}/tv.ndx`))
    .then(() => fs.readFileAsync(`${threadPath}/ivExtractor.ndx`))
    .then(buffer => fs.writeFileAsync(`${threadPath}/ivExtractor.ndx`,
      buffer.toString().replace(ivName, '').replace('  ', ' ') + '\n' +
      `${file[2]} ${ivName}` + '\n'))
    .then(() => fs.readFileAsync(`${threadPath}/Plda.ndx`))
    .then(buffer => fs.writeFileAsync(`${threadPath}/Plda.ndx`,
      buffer.toString().replace(ivName, '').replace(/^ /, '')))
    .then(() => fs.readFileAsync(`${threadPath}/ivTest.ndx`))
    .then(buffer => fs.writeFileAsync(`${threadPath}/ivTest.ndx`,
      buffer.toString().replace('<replace>', file[2])))
    .then(() => fs.readFileAsync(`${threadPath}/ivTestMat.ndx`))
    .then(buffer => fs.writeFileAsync(`${threadPath}/ivTestMat.ndx`,
      buffer.toString().replace('<replace>', file[2]).replace(ivName, '')
        .replace('  ', ' ')))
    .then(() => fs.copyAsync(`${threadPath}/ivExtractorMat.ndx`,
      `${threadPath}/TrainModel.ndx`))
    .then(() => fs.readFileAsync(`${threadPath}/ivExtractor.ndx`))
    .then(buffer => fs.appendFileAsync(`${threadPath}/TrainModel.ndx`,
      '\n' + buffer.toString()));
};

const normPRM = thread => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;

  const enerNorm = [
    `${leaveOnePath}/exe/01_NormFeat`,
    `--config ${leaveOnePath}/cfg/00_PRM_NormFeat_energy.cfg`,
    `--inputFeatureFilename ${threadPath}/data.lst`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`
  ];

  const featNorm = [
    `${leaveOnePath}/exe/01_NormFeat`,
    `--config ${leaveOnePath}/cfg/01_PRM_NormFeat.cfg`,
    `--inputFeatureFilename ${threadPath}/data.lst`,
    `--featureFilesPath ${threadPath}/prm/`,
    `--labelFilesPath ${threadPath}/lbl/`
  ];

  return execAsync(enerNorm.join(' '))
    .then(() => execAsync(featNorm.join(' ')));
};

const wavToPRM = (input, output = prmPath, label = lblPath) => {
  console.log('wav to prm');

  return new BluebirdPromise(resolve => {
    const spro = SPro.create({
      path: ivectorsPath,
      specificPath: `${leaveOnePath}/exe`,
      input,
      output,
      label,
      isDone: false
    });

    spro.addObserver('isDone', () => {
      if (spro.get('isDone')) {
        resolve();
      }
    });
  });
};

const normEnergy = () => {
  console.log('Norm Energy');
  let command = `${leaveOnePath}/exe/01_NormFeat`;
  let options = [
    `--config ${leaveOnePath}/cfg/00_PRM_NormFeat_energy.cfg`,
    `--inputFeatureFilename ${ivectorsPath}/data.lst`,
    `--featureFilesPath ${prmPath}/`,
    `--labelFilesPath ${lblPath}/`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const normFeatures = () => {
  console.log('Norm Features');
  let command = `${leaveOnePath}/exe/01_NormFeat`;
  let options = [
    `--config ${leaveOnePath}/cfg/01_PRM_NormFeat.cfg`,
    `--inputFeatureFilename ${ivectorsPath}/data.lst`,
    `--featureFilesPath ${prmPath}/`,
    `--labelFilesPath ${lblPath}/`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

export {
  wavToPRMConcat,
  copyCommon,
  createFiles,
  normPRM,
  wavToPRM,
  normEnergy,
  normFeatures
};

import SPro from '../../ivectors/0_1_Prepare_PRM/Spro';
import {execAsync} from "../exec-async";
import {logger} from "../logger";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = BluebirdPromise.promisifyAll(require('wav-file-info'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const commonPath = `${leaveOnePath}/common`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;

const wavToPRMConcat = (prmInput = false, inputDirName = '0_input',
  prmInputDir = '1_prmInput') => {
  logger.log('debug', 'wavToPRMConcat');
  const clusters = [];
  return fs.readdirAsync(`${leaveOnePath}/${inputDirName}`)
    .then(dirs =>
      BluebirdPromise.map(dirs,
        dir => {
          clusters.push([dir, []]);
          if (prmInput) {
            return fs.copyAsync(`${leaveOnePath}/${prmInputDir}/${dir}/`,
              `${commonPath}/prm/`)
              .then(() => fs.readdirAsync(
                `${leaveOnePath}/${inputDirName}/${dir}`));
          }
          return fs.readdirAsync(`${leaveOnePath}/${inputDirName}/${dir}`);
        }))
    .then(filesInDirs => {
      filesInDirs.forEach((fileList, idx) => {
        clusters[idx][1] = fileList;
      });
      return BluebirdPromise.map(clusters,
        cluster => BluebirdPromise.map(cluster[1], file => {
          if (!prmInput) {
            const command = [
              `${leaveOnePath}/exe/00_sfbcep`,
              '-F PCM16 -p 19 -e -D -A -l 8 -d 4',
              `${leaveOnePath}/${inputDirName}/${cluster[0]}/${file}`,
              `${commonPath}/prm/${file.replace('wav', 'prm')}`
            ];
            return execAsync(command.join(' '))
              .then(() => wavFileInfo.infoByFilenameAsync(
                `${leaveOnePath}/${inputDirName}/${cluster[0]}/${file}`))
              .then(info => fs.writeFileAsync(
                `${commonPath}/lbl/${file.replace('wav', 'lbl')}`,
                `0 ${info.duration} sound`));
          }
          return wavFileInfo.infoByFilenameAsync(
            `${leaveOnePath}/${inputDirName}/${cluster[0]}/${file}`)
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

const createDepFiles = (file, thread) => {
  logger.log('silly', 'createDepFiles');
  const threadPath = `${leaveOnePath}/threads/${thread}`;

  let depCluster = [];
  return fs.readFileAsync(`${threadPath}/lst/${file[0]}.lst`)
    .then(buffer => {
      buffer = buffer.toString().split('\n');
      buffer.splice(buffer.indexOf(file[2]), 1);
      depCluster = buffer;
      return fs.writeFileAsync(`${threadPath}/lst/${file[0]}.lst`,
        depCluster.join('\n'));
    })
    .then(() => fs.writeFileAsync(`${threadPath}/ndx/${file[0]}.ndx`,
      depCluster.join('\n')))
    .then(() => fs.writeFileAsync(`${threadPath}/ndx/ivEx-${file[0]}.ndx`,
      `${file[0]} ${depCluster.join(' ')}`))
    .then(() => fs.writeFileAsync(`${threadPath}/ndx/Plda-${file[0]}.ndx`,
      `${depCluster.join(' ')}`))
    .then(() => fs.readdirAsync(`${threadPath}/ivTest`))
    .then(dirRead => BluebirdPromise.map(dirRead,
      ivTestFile => fs.readFileAsync(`${threadPath}/ivTest/${ivTestFile}`)
        .then(
          fileRead => fs.writeFileAsync(`${threadPath}/ivTest/${ivTestFile}`,
            fileRead.toString().replace('<replace>', file[2])))));
};

const normPRM = () => {
  logger.log('debug', 'normPRM');

  const featNorm = [
    `${leaveOnePath}/exe/01_NormFeat`,
    `--config ${leaveOnePath}/cfg/01_PRM_NormFeat.cfg`,
    `--inputFeatureFilename ${commonPath}/data.lst`,
    `--featureFilesPath ${commonPath}/prm/`,
    `--labelFilesPath ${commonPath}/lbl/`
  ];

  return execAsync(featNorm.join(' '));
};

const wavToPRM = (input, output = prmPath, label = lblPath) => {
  logger.log('debug', 'wavToPRM');

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
  logger.log('debug', 'Norm Energy');
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
  logger.log('debug', 'Norm Features');
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
  createDepFiles,
  normPRM,
  wavToPRM,
  normEnergy,
  normFeatures
};

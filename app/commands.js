const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const ora = require('ora');
const {firstLayer, secondLayers} = require('../config/environment');
const {
  retrieveFiles,
  parametrizeClusters,
  linkPRMFiles
} = require('./learn/parametrize-clusters');
const {prepareFiles} = require('./learn/prepare-files');
const {createFolds} = require('./utils/ten-fold-preparer');
const {
  normPRM,
  createWorkbenches,
  launchIvProcess
} = require('./learn/ivectors-tools');
const {
  scoreFold,
  isGoodMatch,
  writeConfuseMat,
  humanLayerTestList,
  linkHumanLayer
} = require('./utils/score-tools');

const humanLayer = secondLayers[0];

const extractPRMFiles = () => {
  return retrieveFiles(firstLayer)
    .then(files => parametrizeClusters(files, firstLayer, firstLayer.prmInput))
    .then(() => retrieveFiles(humanLayer))
    .then(files => parametrizeClusters(files, humanLayer, humanLayer.prmInput));
};

const tenFolds = prm => {
  console.time('Ten fold scoring');
  let spinner = ora('Ten folds').start();
  const workbenches = createWorkbenches(firstLayer);
  const wbHumanLayer = createWorkbenches(humanLayer);
  return fs.removeAsync(firstLayer.paths.lRoot)
    .then(() => fs.removeAsync(humanLayer.paths.lRoot))
    .then(() => createFolds(firstLayer))
    .then(() => {
      spinner.text = 'Extracting prm';
      if (prm) {
        return linkPRMFiles(firstLayer)
          .then(linkPRMFiles(humanLayer));
      }
      return extractPRMFiles();
    })
    .then(() => {
      spinner.succeed();
      spinner = ora(`Writing files for layer : ${firstLayer.wbName}`).start();
      return prepareFiles(firstLayer);
    })
    .then(() => {
      spinner.succeed();
      spinner = ora('Normalizing PRM  files').start();
      return normPRM(firstLayer);
    }).then(() => {
      spinner.succeed();
      spinner = ora({
        text: 'Learning systems and testing',
        color: 'red'
      }).start();
      return launchIvProcess(firstLayer, workbenches);
    }).then(() => {
      spinner.succeed();
      spinner = ora('Scoring files').start();
      return BluebirdPromise.map(workbenches, wb => scoreFold(wb));
    })
    .then(() =>
      BluebirdPromise.map(workbenches, wb => isGoodMatch(firstLayer, wb)))
    .then(() => {
      spinner.succeed();
      spinner = ora('Writing confuse matrix').start();
      return writeConfuseMat(firstLayer, workbenches, process.cwd());
    })
    .then(() => {
      spinner.succeed();
      spinner = ora('Preparing second layer').start();
      return BluebirdPromise.map(workbenches, wb => humanLayerTestList(wb));
    })
    .then(() => linkHumanLayer(firstLayer, humanLayer, workbenches))
    .then(() => {
      spinner.succeed();
      spinner = ora(`Writing files for layer : ${humanLayer.wbName}`).start();
      return prepareFiles(humanLayer);
    })
    .then(() => {
      spinner.succeed();
      spinner = ora('Normalizing PRM  files').start();
      return normPRM(humanLayer);
    }).then(() => {
      spinner.succeed();
      spinner = ora({
        text: 'Learning systems and testing',
        color: 'red'
      }).start();
      return launchIvProcess(humanLayer, wbHumanLayer);
    }).then(() => {
      spinner.succeed();
      spinner = ora('Scoring files').start();
      return BluebirdPromise.map(wbHumanLayer, wb => scoreFold(wb));
    })
    .then(() =>
      BluebirdPromise.map(wbHumanLayer, wb => isGoodMatch(humanLayer, wb)))
    .then(() => {
      spinner.succeed();
      spinner = ora('Writing confuse matrix').start();
      return writeConfuseMat(humanLayer, wbHumanLayer, process.cwd());
    })
    .then(() => {
      spinner.succeed();
      console.timeEnd('Ten fold scoring');
    });
};

module.exports = {extractPRMFiles, tenFolds};

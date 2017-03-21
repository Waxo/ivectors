const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const ora = require('ora');
const {firstLayer, secondLayers} = require('../config/environment');
const {
  retrieveFiles,
  parametrizeClusters,
  linkPRMFiles,
  linkPRMWorkbench
} = require('./learn/parametrize-clusters');
const {prepareFiles} = require('./learn/prepare-files');
const {createFolds} = require('./utils/ten-fold-preparer');
const {
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

const extractPRMFiles = (outputDir = '') => {
  let firstLayerOutput = firstLayer.prmInput;
  let humanLayerOutput = humanLayer.prmInput;
  if (outputDir) {
    firstLayerOutput = `${process.cwd()}/${outputDir}/l${firstLayer.wbName}`;
    humanLayerOutput = `${process.cwd()}/${outputDir}/l${humanLayer.wbName}`;
  }

  return retrieveFiles(firstLayer)
    .then(files => parametrizeClusters(files, firstLayer, firstLayerOutput))
    .then(() => retrieveFiles(humanLayer))
    .then(files => parametrizeClusters(files, humanLayer, humanLayerOutput));
};

const firstLayerProcess_ = workbenches => {
  let spinner = ora(`Writing files for layer : ${firstLayer.wbName}`).start();
  return prepareFiles(firstLayer)
    .then(() => {
      spinner.succeed();
      spinner = ora({
        text: 'Learning systems and testing',
        color: 'red'
      }).start();
      return launchIvProcess(firstLayer, workbenches);
    })
    .then(() => {
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
    .then(() => spinner.succeed());
};

const humanLayerProcess_ = (workbenches, wbsHumanLayer) => {
  let spinner = ora('Preparing second layer').start();
  return BluebirdPromise.map(workbenches, wb => humanLayerTestList(wb))
    .then(() => linkHumanLayer(firstLayer, humanLayer, workbenches))
    .then(() => {
      spinner.succeed();
      spinner = ora(`Writing files for layer : ${humanLayer.wbName}`).start();
      return prepareFiles(humanLayer);
    })
    .then(() => {
      spinner.succeed();
      spinner = ora({
        text: 'Learning systems and testing',
        color: 'red'
      }).start();
      return launchIvProcess(humanLayer, wbsHumanLayer);
    }).then(() => {
      spinner.succeed();
      spinner = ora('Scoring files').start();
      return BluebirdPromise.map(wbsHumanLayer, wb => scoreFold(wb));
    })
    .then(() =>
      BluebirdPromise.map(wbsHumanLayer, wb => isGoodMatch(humanLayer, wb)))
    .then(() => {
      spinner.succeed();
      spinner = ora('Writing confuse matrix').start();
      return writeConfuseMat(humanLayer, wbsHumanLayer, process.cwd());
    })
    .then(() => spinner.succeed());
};

const tenFolds = createPRM => {
  console.time('Ten fold scoring');
  let spinner = ora('Ten folds').start();
  const workbenches = createWorkbenches(firstLayer);
  const wbsHumanLayer = createWorkbenches(humanLayer);
  return fs.removeAsync(firstLayer.paths.lRoot)
    .then(() => fs.removeAsync(humanLayer.paths.lRoot))
    .then(() => createFolds(firstLayer))
    .then(() => {
      spinner.succeed();
      if (createPRM) {
        return extractPRMFiles();
      }
      return linkPRMFiles(firstLayer)
        .then(() => linkPRMFiles(humanLayer));
    })
    .then(() => {
      spinner = ora('Link PRM to workbench');
      return linkPRMWorkbench(firstLayer, workbenches);
    })
    .then(() => linkPRMWorkbench(humanLayer, wbsHumanLayer))
    .then(() => {
      spinner.succeed();
      return firstLayerProcess_(workbenches);
    })
    .then(() => humanLayerProcess_(workbenches, wbsHumanLayer))
    .then(() => {
      console.timeEnd('Ten fold scoring');
    });
};

module.exports = {extractPRMFiles, tenFolds};

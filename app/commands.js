/* eslint-disable max-nested-callbacks */
const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');
const ora = require('ora');
const {firstLayer, secondLayers} = require('../config/environment');
const {
  retrieveFiles,
  parametrizeClusters,
  linkPRMFiles,
  linkPRMWorkbench,
  linkTestPRM,
  relinkFiles,
  linkNoises
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
  // let humanLayerOutput = humanLayer.prmInput;
  if (outputDir) {
    firstLayerOutput = `${process.cwd()}/${outputDir}/l${firstLayer.wbName}`;
    // humanLayerOutput = `${process.cwd()}/${outputDir}/l${humanLayer.wbName}`;
  }

  return retrieveFiles(firstLayer)
    .then(files => parametrizeClusters(files, firstLayer, firstLayerOutput))
    // .then(() => retrieveFiles(humanLayer))
    // .then(files => parametrizeClusters(files, humanLayer, humanLayerOutput));
};

const firstLayerProcess_ = (workbenches, dnnScorer = true,
  noisesSuffixes = false) => {
  let spinner = ora(`Writing files for layer : ${firstLayer.wbName}`).start();
  return prepareFiles(firstLayer, noisesSuffixes)
    .then(() => {
      spinner.succeed();
      spinner = ora({
        text: 'Learning systems and testing',
        color: 'red'
      }).start();
      return launchIvProcess(firstLayer, workbenches, dnnScorer);
    })
    .then(() => {
      spinner.succeed();
      spinner = ora('Scoring files').start();
      return BluebirdPromise.map(workbenches, wb => scoreFold(wb,
        dnnScorer, noisesSuffixes));
    })
    .then(
      () => BluebirdPromise.map(workbenches, wb => isGoodMatch(firstLayer, wb)))
    .then(() => {
      spinner.succeed();
      spinner =
        ora('Writing confuse matrix').start();
      return writeConfuseMat(firstLayer, workbenches, process.cwd());
    })
    .then(() => spinner.succeed());
};

const humanLayerProcess_ = (workbenches, wbsHumanLayer, dnnScorer = true,
  noisesSuffixes = false) => {
  let spinner = ora('Preparing second layer').start();
  return BluebirdPromise.map(workbenches, wb => humanLayerTestList(wb))
    .then(() => linkHumanLayer(firstLayer, humanLayer, workbenches))
    .then(() => {
      spinner.succeed();
      spinner = ora(`Writing files for layer : ${humanLayer.wbName}`).start();
      return prepareFiles(humanLayer, noisesSuffixes);
    })
    .then(() => {
      spinner.succeed();
      spinner = ora({
        text: 'Learning systems and testing',
        color: 'red'
      }).start();
      return launchIvProcess(humanLayer, wbsHumanLayer, dnnScorer);
    }).then(() => {
      spinner.succeed();
      spinner = ora('Scoring files').start();
      return BluebirdPromise.map(wbsHumanLayer,
        wb => scoreFold(wb, dnnScorer, noisesSuffixes));
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

const tenFolds = (createPRM, testPRM, dnnScorer = true, addNoises = false) => {
  console.time('Ten fold scoring');
  let spinner = ora('Ten folds').start();
  const suffixes = [];
  const workbenches = createWorkbenches(firstLayer);
  // const wbsHumanLayer = createWorkbenches(humanLayer);
  return fs.remove(firstLayer.paths.lRoot)
    // .then(() => fs.remove(humanLayer.paths.lRoot))
    .then(() => createFolds(firstLayer))
    .then(() => {
      spinner.succeed();
      spinner.succeed();
      if (createPRM) {
        return extractPRMFiles();
      }
      spinner = ora('No PRM creation. Linking existing to layers');
      return linkPRMFiles(firstLayer)
        // .then(() => linkPRMFiles(humanLayer));
    })
    .then(() => {
      if (addNoises) {
        return linkNoises(firstLayer, addNoises)
          .then(suffixList => {
            suffixes.push(...suffixList);
            return relinkFiles(workbenches, suffixList);
          })
          // .then(() => linkNoises(humanLayer, addNoises))
        // .then(suffixList => relinkFiles(wbsHumanLayer, suffixList));
      }
    })
    .then(() => {
      spinner.succeed();
      spinner = ora('Link PRM to workbench');
      return linkPRMWorkbench(firstLayer, workbenches);
    })
    // .then(() => linkPRMWorkbench(humanLayer, wbsHumanLayer))
    // .then(() => BluebirdPromise.map(workbenches,
    //   (wb, index) => fs.readdir(wb.test)
    //     .then(files => {
    //       files = files.filter(
    //         file => humanLayer.clusters.indexOf(file.split('-')[0]) >= 0);
    //       return BluebirdPromise.map(files,
    //         file => fs.ensureSymlink(`${wb.test}/${file}`,
    //           `${wbsHumanLayer[index].test}/${file}`));
    //     })))
    .then(() => {
      if (testPRM) {
        spinner.succeed();
        spinner = ora('Test PRM different than inputPRM relinking them');
        return linkTestPRM(workbenches, `${testPRM}/lFirst`)
          // .then(() => {
          //   return linkTestPRM(wbsHumanLayer, `${testPRM}/lHuman`);
          // });
      }
    })
    .then(() => {
      spinner.succeed();
      return firstLayerProcess_(workbenches, dnnScorer,
        (addNoises) ? suffixes : false);
    })
    // .then(() => humanLayerProcess_(workbenches, wbsHumanLayer, dnnScorer,
    //   (addNoises) ? suffixes : false))
    .then(() => {
      console.timeEnd('Ten fold scoring');
    });
};

module.exports = {extractPRMFiles, tenFolds};

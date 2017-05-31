const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');
const brain = require('brain.js');

const ivInput = 'raw';

const globalIVData = fold => {
  const dirList = [];
  return fs.readdir(`${process.cwd()}/layers/lFirst/input/f${fold}`)
    .then(dirs => {
      dirList.push(...dirs);
      return BluebirdPromise.map(dirs, dir => fs.readFile(
        `${process.cwd()}/layers/lFirst/work/f${fold}/iv/${ivInput}/${dir}.y`));
    })
    .then(ivectors => ivectors.map(iv => {
      [, iv] = iv.toString().split('\n');
      return iv.split(' ').map(val => Number(val));
    }))
    .then(ivectors => ivectors.map(
      (iv, index) => ({input: iv, output: {[dirList[index]]: 1}})));
};

const oneByOneIVData = fold => {
  const inputList = [];
  return fs.readdir(`${process.cwd()}/layers/lFirst/input/f${fold}`)
    .then(dirs => BluebirdPromise.map(dirs, dir => fs.readdir(
      `${process.cwd()}/layers/lFirst/input/f${fold}/${dir}`)))
    .then(fileLists => {
      inputList.push(...[].concat.apply([], fileLists)
        .map(file => file.replace('.wav', '')));
      return BluebirdPromise.map(inputList, file => fs.readFile(
        `${process.cwd()}/layers/lFirst/work/f${fold}/iv/${ivInput}/${file}.y`));
    })
    .then(ivectors => ivectors.map(iv => {
      [, iv] = iv.toString().split('\n');
      return iv.split(' ').map(val => Number(val));
    }))
    .then(ivectors => ivectors.map((iv, index) => ({
      input: iv,
      output: {[layerAbstractor(inputList[index].split('-')[0])]: 1}
    })));
};

const retrieveBest = res => {
  const resArray = [];
  for (const key in res) {
    if (Object.prototype.hasOwnProperty.call(res, key)) {
      resArray.push([key, res[key]]);
    }
  }

  resArray.sort((a, b) => b[1] - a[1]);
  return resArray[0][0];
};

const layerAbstractor = (clusterName) => {
  return ['Breathing', 'Cough', 'FemaleCry', 'FemaleScream', 'Laugh',
    'MaleScream', 'Sneeze', 'Yawn'].indexOf(clusterName) >= 0 ? 'Human' :
    clusterName;
};

const testDNNScore = fold => {
  const net = new brain.NeuralNetwork();
  const list = [];
  // return globalIVData(fold)
  return oneByOneIVData(fold)
    .then(base => {
      net.train(base, {
        errorThresh: 0.00015,  // error threshold to reach
        iterations: 20000,   // maximum training iterations
        log: true,           // console.log() progress periodically
        logPeriod: 100,       // number of iterations between logging
        learningRate: 0.05    // learning rate
      });

      return fs.readdir(`${process.cwd()}/layers/lFirst/test/f${fold}`);
    })
    .then(testList => {
      list.push(...testList.map(test => test.replace('.wav', '')));
      return BluebirdPromise.map(list, test => fs.readFile(
        `${process.cwd()}/layers/lFirst/work/f${fold}/iv/${ivInput}/${test}.y`));
    }).then(ivectors => ivectors.map(iv => {
      [, iv] =
        iv.toString().split('\n');
      return iv.split(' ').map(val => Number(val));
    })).then(ivectors => {
      const count = ivectors.filter((iv, index) =>
      retrieveBest(net.run(iv)) ===
      layerAbstractor(list[index].split('-')[0])).length;
      console.log(`${count}/${ivectors.length}`);
      return count;
    });
};

module.exports = {testDNNScore};

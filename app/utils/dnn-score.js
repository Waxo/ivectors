const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');
const brain = require('brain.js');

const layerAbstraction_ = clusterName => {
  return ['Breathing', 'Cough', 'FemaleCry', 'FemaleScream', 'Laugh',
    'MaleScream', 'Sneeze', 'Yawn'].indexOf(clusterName) >= 0 ? 'Human' :
    clusterName;
};

const oneByOneIVData_ = (wbFold, noisesSuffixes) => {
  let inputList = [];
  return fs.readdir(wbFold.input)
    .then(dirs => BluebirdPromise.map(dirs, dir => fs.readdir(
      `${wbFold.input}/${dir}`)))
    .then(fileLists => {
      inputList.push(...[].concat.apply([], fileLists)
        .map(file => file.replace('.wav', '')));
      if (noisesSuffixes) {
        inputList = [].concat.apply([], inputList.map(a => {
          const miniList = [a];
          miniList.push(...noisesSuffixes.map(b => `${a}_${b}`));
          return miniList;
        }));
      }
      return BluebirdPromise.map(inputList, file => fs.readFile(
        `${wbFold.ivRaw}/${file}.y`));
    })
    .then(ivectors => ivectors.map(iv => {
      [, iv] = iv.toString().split('\n');
      return iv.split(' ').map(val => Number(val));
    }))
    .then(ivectors => {
      return ivectors.map((iv, index) => {
        const output = wbFold.aggregateClusters ?
          {[layerAbstraction_(inputList[index].split('-')[0])]: 1} :
          {[inputList[index].split('-')[0]]: 1};
        return {
          input: iv,
          output
        };
      });
    });
};

const retrieveBest_ = res => {
  const resArray = [];
  for (const key in res) {
    if (Object.prototype.hasOwnProperty.call(res, key)) {
      resArray.push([key, res[key]]);
    }
  }

  resArray.sort((a, b) => b[1] - a[1]);
  return resArray[0][0];
};

const testDNNScore = (wbFold, noisesSuffixes) => {
  const net = new brain.NeuralNetwork();
  const list = [];
  return oneByOneIVData_(wbFold, noisesSuffixes)
    .then(base => {
      net.train(base, {
        errorThresh: 0.00015,
        iterations: 20000,
        log: false,
        logPeriod: 100,
        learningRate: 0.05
      });

      return fs.readdir(wbFold.test);
    })
    .then(testList => {
      list.push(...testList.map(test => test.replace('.wav', '')));
      return BluebirdPromise.map(list, test => fs.readFile(
        `${wbFold.ivRaw}/${test}.y`));
    }).then(ivectors => ivectors.map(iv => {
      [, iv] =
        iv.toString().split('\n');
      return iv.split(' ').map(val => Number(val));
    })).then(ivectors => {
      const mapRes = new Map();
      ivectors.forEach((iv, index) => {
        mapRes.set(list[index], retrieveBest_(net.run(iv)));
      });
      return mapRes;
    });
};

module.exports = {testDNNScore};

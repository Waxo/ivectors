const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const absoluteNormalizationAdd_ = results => {
  const sums = {};
  results.forEach(resList => {
    const max = Math.max(...resList.map(a => Math.abs(a[1])));
    resList.forEach(([clusterName, res]) => {
      if (!sums[clusterName]) {
        sums[clusterName] = 0;
      }
      sums[clusterName] += Number(res) / max;
    });
  });

  const sortable = [];
  for (const clusterName in sums) {
    if (Object.prototype.hasOwnProperty.call(sums, clusterName)) {
      sortable.push([clusterName, sums[clusterName]]);
    }
  }
  sortable.sort((a, b) => b[1] - a[1]);
  return sortable[0][0];
};

const compareResults_ = ([sphResults, pldaResults]) => {
  const anaByFile = new Map();
  for (const key in sphResults) {
    if (Object.prototype.hasOwnProperty.call(sphResults, key) &&
      Object.prototype.hasOwnProperty.call(pldaResults, key)) {
      anaByFile.set(key,
        absoluteNormalizationAdd_([pldaResults[key], sphResults[key]]));
    }
  }
  return anaByFile;
};

const parseResults_ = results => {
  const resultsByFile = {};
  const res = results.toString().split('\n')
    .map(res => res.split(' '))
    .filter(res => res.length > 1)
    .map(res => [res[3], res[1], res[4]]);
  res.forEach(([fileName, ...clusterAndRes]) => {
    if (resultsByFile[fileName]) {
      resultsByFile[fileName].push(clusterAndRes);
    } else {
      resultsByFile[fileName] = [clusterAndRes];
    }
  });
  return resultsByFile;
};

const scoreFold = wbFold => {
  return BluebirdPromise.all([
    fs.readFileAsync(`${wbFold.scores.sph}/${wbFold.fold}.txt`),
    fs.readFileAsync(`${wbFold.scores.plda}/${wbFold.fold}.txt`)
  ])
    .then(([sphResults, pldaResults]) => {
      sphResults = parseResults_(sphResults);
      pldaResults = parseResults_(pldaResults);
      wbFold.results = compareResults_([sphResults, pldaResults]);
    });
};

const isGoodMatch = (layer, wbFold) => {
  const layerRes = new Map();
  if (layer.aggregateClusters) {
    layer.aggregateClusters.forEach(aggregate => {
      layerRes.set(aggregate[0], aggregate[1]);
    });
  }

  wbFold.results.forEach((value, key) => {
    const [originCluster] = key.split('-');
    if (originCluster === value) {
      wbFold.results.set(key, [true, value]);
    } else if (layerRes.has(value) &&
      layerRes.get(value).indexOf(originCluster) >= 0) {
      wbFold.results.set(key, [true, value]);
    } else {
      wbFold.results.set(key, [false, value]);
    }
  });
};

const humanLayerTestList = wbFold => {
  wbFold.goHuman = [];
  wbFold.results.forEach(([match, cluster], key) => {
    if (match === true && cluster === 'Human') {
      wbFold.goHuman.push(key);
    }
  });
};

const linkHumanLayer = (layer, humanLayer, workbenches) => {
  const promises = [];
  workbenches.forEach(wb => {
    wb.goHuman.forEach(file => {
      promises.push(
        fs.ensureSymlinkAsync(`${layer.paths.test}/f${wb.fold}/${file}.wav`,
          `${humanLayer.paths.test}/f${wb.fold}/${file}.wav`));
    });
  });
  return BluebirdPromise.all(promises);
};

const retrieveClusters_ = layer => {
  const clusters = new Array(...layer.clusters);

  if (layer.aggregateClusters) {
    clusters.push(...layer.aggregateClusters.map(([agName]) => agName));
  }
  clusters.sort();
  return clusters;
};

const initMatrix_ = layer => {
  const clusters = retrieveClusters_(layer);

  const matrix = {};
  clusters.forEach(cluster => {
    matrix[cluster] = {};
    clusters.forEach(clusterName => {
      matrix[cluster][clusterName] = 0;
    });
  });
  return matrix;
};

const createConfuseMat_ = (layer, workbenches) => {
  const matrix = initMatrix_(layer);
  const results = workbenches.map(wb => wb.results);

  results.forEach(resultMap => {
    resultMap.forEach(([match, classMatched], key) => {
      const [fileCluster] = key.split('-');
      if (match) {
        matrix[classMatched][classMatched]++;
      } else if (matrix[fileCluster] &&
        matrix[fileCluster][classMatched] !== 'undefined') {
        matrix[fileCluster][classMatched]++;
      } else {
        layer.aggregateClusters.forEach(([clusterName, clusters]) => {
          if (clusters.indexOf(fileCluster) >= 0) {
            matrix[clusterName][classMatched]++;
          }
        });
      }
    });
  });
  return matrix;
};

const writeConfuseMat = (layer, workbenches, path) => {
  const matrix = createConfuseMat_(layer, workbenches);

  let confuseMat = '';
  for (const cluster in matrix) {
    if (Object.prototype.hasOwnProperty.call(matrix, cluster)) {
      let line = '';
      let countSamples = 0;
      for (const matchedCluster in matrix[cluster]) {
        if (Object.prototype.hasOwnProperty.call(matrix[cluster],
            matchedCluster)) {
          countSamples += matrix[cluster][matchedCluster];
          line += `${matrix[cluster][matchedCluster]},`;
        }
      }
      confuseMat += `${cluster},${countSamples},${line}\n`;
    }
  }

  return fs.writeFileAsync(`${path}/${layer.wbName}.csv`, confuseMat);
};

module.exports = {
  scoreFold,
  isGoodMatch,
  humanLayerTestList,
  writeConfuseMat,
  linkHumanLayer
};

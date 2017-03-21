const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const foldDataLST_ = (layer, fold) => {
  return fs.ensureDirAsync(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdirAsync(`${layer.paths.input}/f${fold}`))
    .then(dirs => BluebirdPromise.map(dirs,
      dir => fs.readdirAsync(`${layer.paths.input}/f${fold}/${dir}`)))
    .then(results => {
      const catResults = [];
      results.forEach(result => {
        catResults.push(...result);
      });
      return fs.writeFileAsync(`${layer.paths.files}/f${fold}/data.lst`,
        catResults.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvExtractorNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  const clusters = [];

  return fs.ensureDirAsync(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdirAsync(foldInputPath))
    .then(dirs => {
      clusters.push(...dirs);
      return BluebirdPromise.map(dirs,
        dir => fs.readdirAsync(`${foldInputPath}/${dir}`));
    })
    .then(filesLists => {
      const buffWrite = [];
      filesLists.forEach((list, index) => {
        buffWrite.push(`${clusters[index]} ${list.join(' ')}`);
      });
      return fs.writeFileAsync(`${layer.paths.files}/f${fold}/ivExtractor.ndx`,
        buffWrite.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvExtractorMatNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  const clusters = [];

  return fs.ensureDirAsync(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdirAsync(foldInputPath))
    .then(dirs => {
      clusters.push(...dirs);
      return BluebirdPromise.map(dirs,
        dir => fs.readdirAsync(`${foldInputPath}/${dir}`));
    })
    .then(filesLists => {
      const buffWrite = [];
      filesLists.forEach(list => {
        buffWrite.push(list.map(element => `${element} ${element}`).join('\n'));
      });
      return fs.writeFileAsync(
        `${layer.paths.files}/f${fold}/ivExtractorMat.ndx`,
        buffWrite.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvTestNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;

  return fs.ensureDirAsync(`${layer.paths.files}/f${fold}`)
    .then(() => BluebirdPromise.all([
      fs.readdirAsync(foldInputPath),
      fs.readdirAsync(`${layer.paths.test}/f${fold}`)
    ]))
    .then(([testClusters, filesTested]) => {
      testClusters = testClusters.join(' ');
      return fs.writeFileAsync(`${layer.paths.files}/f${fold}/ivTest.ndx`,
        filesTested.map(file => `${file.replace('.wav', '')} ${testClusters}`)
          .join('\n'));
    });
};

const foldIvTestMatNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  return fs.ensureDirAsync(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdirAsync(foldInputPath))
    .then(dirs => BluebirdPromise.map(dirs,
      dir => fs.readdirAsync(`${foldInputPath}/${dir}`)))
    .then(filesLists => {
      const joinedList = [];
      filesLists.forEach(list => {
        joinedList.push(...list);
      });
      return fs.writeFileAsync(`${layer.paths.files}/f${fold}/ivTestMat.ndx`,
        `${joinedList[0].replace('.wav', '')} ${joinedList.join(' ')
          .replace(/\.wav/g, '')}`);
    });
};

const foldPldaNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  return fs.readdirAsync(foldInputPath)
    .then(dirs => BluebirdPromise.map(dirs,
      dir => fs.readdirAsync(`${foldInputPath}/${dir}`)))
    .then(
      filesLists => fs.writeFileAsync(`${layer.paths.files}/f${fold}/Plda.ndx`,
        filesLists.map(list => list.join(' ')).join('\n')
          .replace(/\.wav/g, '')));
};

const writeDataLST = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldDataLST_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeTvNDX = layer => {
  const foldPromises = [];
  for (let i = 0; i < 10; i++) {
    foldPromises.push(
      fs.copyAsync(`${layer.paths.files}/f${i}/data.lst`,
        `${layer.paths.files}/f${i}/tv.ndx`));
  }
  return BluebirdPromise.all(foldPromises);
};

const writeIvExtractorNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvExtractorNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeIvExtractorMatNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvExtractorMatNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeTrainModelNDX = layer => {
  const foldPromises = [];

  for (let i = 0; i < 10; i++) {
    const filesPath = `${layer.paths.files}/f${i}`;
    foldPromises.push(
      BluebirdPromise.all([
        fs.copyAsync(`${filesPath}/ivExtractorMat.ndx`,
          `${filesPath}/TrainModel.ndx`),
        fs.readFileAsync(`${filesPath}/ivExtractor.ndx`)
      ])
        .then(
          ([, ivExtractor]) => fs.appendFileAsync(`${filesPath}/TrainModel.ndx`,
            '\n' + ivExtractor.toString()))
    );
  }
  return BluebirdPromise.all(foldPromises);
};

const writeIvTestNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvTestNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeCreateIvTestMatNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvTestMatNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writePldaNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldPldaNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeAllLST = layer => {
  return fs.readdirAsync(layer.paths.prm)
    .then(prmFiles => {
      let writeBuffer = prmFiles.filter(f => !f.match(/norm/g)).join('\n')
        .replace(/\.prm/g, '');
      const normPRMLST = writeBuffer;
      writeBuffer += '\n' + layer.clusters.join('\n');
      if (layer.aggregateClusters) {
        layer.aggregateClusters.forEach(cluster => {
          writeBuffer += '\n' + cluster[0];
        });
      }
      return BluebirdPromise.all([
        fs.writeFileAsync(`${layer.paths.lRoot}/normPRM.lst`, normPRMLST),
        fs.writeFileAsync(`${layer.paths.lRoot}/all.lst`, writeBuffer)
      ]);
    });
};

const writeIvExtractorAllNDX = layer => {
  return fs.readdirAsync(layer.paths.prm)
    .then(files => {
      files = files.filter(f => !f.match(/norm/g)).map(f => `${f} ${f}`);
      return fs.writeFileAsync(`${layer.paths.lRoot}/ivExtractorAll.ndx`,
        files.join('\n').replace(/\.prm/g, ''));
    });
};

const linkIvExtractorAllNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(
      fs.ensureSymlinkAsync(`${layer.paths.lRoot}/ivExtractorAll.ndx`,
        `${layer.paths.files}/f${i}/ivExtractorAll.ndx`));
  }
  return BluebirdPromise.all(foldsPromises);
};

const prepareFiles = layer => {
  return writeDataLST(layer)
    .then(() => writeTvNDX(layer))
    .then(() => writeIvExtractorNDX(layer))
    .then(() => writeIvExtractorMatNDX(layer))
    .then(() => writeTrainModelNDX(layer))
    .then(() => writeIvTestNDX(layer))
    .then(() => writeCreateIvTestMatNDX(layer))
    .then(() => writePldaNDX(layer))
    .then(() => writeAllLST(layer))
    .then(() => writeIvExtractorAllNDX(layer))
    .then(() => linkIvExtractorAllNDX(layer));
};

module.exports = {
  writeDataLST,
  writeTvNDX,
  writeIvExtractorNDX,
  writeIvExtractorMatNDX,
  writeTrainModelNDX,
  writeIvTestNDX,
  writeCreateIvTestMatNDX,
  writePldaNDX,
  writeAllLST,
  writeIvExtractorAllNDX,
  linkIvExtractorAllNDX,
  prepareFiles
};

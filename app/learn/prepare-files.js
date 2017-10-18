const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');

const noisesAdder_ = (list, noisesSuffixes) => {
  if (!noisesSuffixes) {
    return list;
  }
  return [].concat.apply([], list.map(a => {
    const miniList = [a];
    miniList.push(...noisesSuffixes.map(b => `${a}_${b}`));
    return miniList;
  }));
};

const foldDataLST_ = (layer, fold) => {
  return fs.ensureDir(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdir(`${layer.paths.prm}`))
    .then(results => {
      return fs.writeFile(`${layer.paths.files}/f${fold}/data.lst`,
        results.join('\n').replace(/\.prm/g, ''));
    });
};

const foldIvExtractorNDX_ = (layer, fold, noisesSuffixes) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  const clusters = [];

  return fs.ensureDir(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdir(foldInputPath))
    .then(dirs => {
      clusters.push(...dirs);
      return BluebirdPromise.map(dirs,
        dir => fs.readdir(`${foldInputPath}/${dir}`));
    })
    .then(filesLists => {
      const buffWrite = [];
      filesLists.forEach((list, index) => {
        list = noisesAdder_(list, noisesSuffixes);
        buffWrite.push(`${clusters[index]} ${list.join(' ')}`);
      });
      return fs.writeFile(`${layer.paths.files}/f${fold}/ivExtractor.ndx`,
        buffWrite.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvExtractorMatNDX_ = (layer, fold, noisesSuffixes) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  const clusters = [];

  return fs.ensureDir(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdir(foldInputPath))
    .then(dirs => {
      clusters.push(...dirs);
      return BluebirdPromise.map(dirs,
        dir => fs.readdir(`${foldInputPath}/${dir}`));
    })
    .then(filesLists => {
      const buffWrite = [];
      filesLists.forEach(list => {
        list = noisesAdder_(list, noisesSuffixes);
        buffWrite.push(list.map(element => `${element} ${element}`).join('\n'));
      });
      return fs.writeFile(
        `${layer.paths.files}/f${fold}/ivExtractorMat.ndx`,
        buffWrite.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvTestNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;

  return fs.ensureDir(`${layer.paths.files}/f${fold}`)
    .then(() => BluebirdPromise.all([
      fs.readdir(foldInputPath),
      fs.readdir(`${layer.paths.test}/f${fold}`)
    ]))
    .then(([testClusters, filesTested]) => {
      testClusters = testClusters.join(' ');
      return fs.writeFile(`${layer.paths.files}/f${fold}/ivTest.ndx`,
        filesTested.map(file => `${file.replace('.wav', '')} ${testClusters}`)
          .join('\n'));
    });
};

const foldIvTestMatNDX_ = (layer, fold, noisesSuffixes) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  return fs.ensureDir(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdir(foldInputPath))
    .then(dirs => BluebirdPromise.map(dirs,
      dir => fs.readdir(`${foldInputPath}/${dir}`)))
    .then(filesLists => {
      const joinedList = [];
      filesLists.forEach(list => {
        list = noisesAdder_(list, noisesSuffixes);
        joinedList.push(...list);
      });
      return fs.writeFile(`${layer.paths.files}/f${fold}/ivTestMat.ndx`,
        `${joinedList[0].replace('.wav', '')} ${joinedList.join(' ')
          .replace(/\.wav/g, '')}`);
    });
};

const foldPldaNDX_ = (layer, fold, noisesSuffixes) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  return fs.readdir(foldInputPath)
    .then(dirs => BluebirdPromise.map(dirs,
      dir => fs.readdir(`${foldInputPath}/${dir}`)))
    .then(
      filesLists => fs.writeFile(`${layer.paths.files}/f${fold}/Plda.ndx`,
        filesLists.map(list => noisesAdder_(list, noisesSuffixes).join(' '))
          .join('\n').replace(/\.wav/g, '')));
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
      fs.copy(`${layer.paths.files}/f${i}/data.lst`,
        `${layer.paths.files}/f${i}/tv.ndx`));
  }
  return BluebirdPromise.all(foldPromises);
};

const writeIvExtractorNDX = (layer, noisesSuffixes) => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvExtractorNDX_(layer, i, noisesSuffixes));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeIvExtractorMatNDX = (layer, noisesSuffixes) => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvExtractorMatNDX_(layer, i, noisesSuffixes));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeTrainModelNDX = layer => {
  const foldPromises = [];

  for (let i = 0; i < 10; i++) {
    const filesPath = `${layer.paths.files}/f${i}`;
    foldPromises.push(
      BluebirdPromise.all([
        fs.copy(`${filesPath}/ivExtractorMat.ndx`,
          `${filesPath}/TrainModel.ndx`),
        fs.readFile(`${filesPath}/ivExtractor.ndx`)
      ])
        .then(
          ([, ivExtractor]) => fs.appendFile(`${filesPath}/TrainModel.ndx`,
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

const writeCreateIvTestMatNDX = (layer, noisesSuffixes) => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvTestMatNDX_(layer, i, noisesSuffixes));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writePldaNDX = (layer, noisesSuffixes) => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldPldaNDX_(layer, i, noisesSuffixes));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeAllLST = layer => {
  return fs.readdir(layer.paths.prm)
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
        fs.writeFile(`${layer.paths.lRoot}/normPRM.lst`, normPRMLST),
        fs.writeFile(`${layer.paths.lRoot}/all.lst`, writeBuffer)
      ]);
    });
};

const writeIvExtractorAllNDX = layer => {
  return fs.readdir(layer.paths.prm)
    .then(files => {
      files = files.filter(f => !f.match(/norm/g)).map(f => `${f} ${f}`);
      return fs.writeFile(`${layer.paths.lRoot}/ivExtractorAll.ndx`,
        files.join('\n').replace(/\.prm/g, ''));
    });
};

const linkIvExtractorAllNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(
      fs.ensureSymlink(`${layer.paths.lRoot}/ivExtractorAll.ndx`,
        `${layer.paths.files}/f${i}/ivExtractorAll.ndx`));
  }
  return BluebirdPromise.all(foldsPromises);
};

const prepareFiles = (layer, noisesSuffixes) => {
  return writeDataLST(layer)
    .then(() => writeTvNDX(layer))
    .then(() => writeIvExtractorNDX(layer, noisesSuffixes))
    .then(() => writeIvExtractorMatNDX(layer, noisesSuffixes))
    .then(() => writeTrainModelNDX(layer))
    .then(() => writeIvTestNDX(layer))
    .then(() => writeCreateIvTestMatNDX(layer, noisesSuffixes))
    .then(() => writePldaNDX(layer, noisesSuffixes))
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

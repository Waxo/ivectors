const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = BluebirdPromise.promisifyAll(require('wav-file-info'));
const {
  getParamsFromFile,
  parameters,
  arrayToRaw
} = require('sound-parameters-extractor');

const extractLabel = (path, file, labelPath) => {
  return fs.ensureDirAsync(labelPath)
    .then(() => wavFileInfo.infoByFilenameAsync(path))
    .then(info => fs.writeFileAsync(`${labelPath}/${file}.lbl`,
      `0 ${info.duration} sound`));
};

const parametrizeSound = (path, layer, output = null) => {
  const file = path.split('/').pop().replace('.wav', '');
  const outputDir = output || layer.paths.prm;
  return fs.ensureDirAsync(outputDir)
    .then(() => getParamsFromFile(path, layer.cfgMFCC, layer.mfccSize))
    .then(params => {
      const tmpVector = params.mfcc.map((acousticFeatures, index) => {
        if (layer.useRER) {
          return acousticFeatures.concat([
            params.sc2[index],
            params.srf[index],
            params.zcr[index],
            params.rer[index]
          ]);
        }
        return acousticFeatures.concat([
          params.sc2[index],
          params.srf[index],
          params.zcr[index]
        ]);
      });
      const delta = parameters.deltaCustomAllSignal(tmpVector);
      const deltaDelta = parameters.deltaDeltaCustomAllSignal(tmpVector);
      const vector = tmpVector.map(
        (vector, index) => vector.concat(delta[index],
          deltaDelta[index]));
      if (output) {
        return arrayToRaw(vector, `${file}.prm`, `${outputDir}/`);
      }
      return arrayToRaw(vector, `${file}.prm`, `${outputDir}/`)
        .then(() => extractLabel(path, file, layer.paths.lbl));
    });
};

module.exports = {parametrizeSound, extractLabel};

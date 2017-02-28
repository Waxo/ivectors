const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wavFileInfo = BluebirdPromise.promisifyAll(require('wav-file-info'));
const {
  getParamsFromFile,
  parameters,
  arrayToRaw
} = require('sound-parameters-extractor');

const extractLabel_ = (path, file, labelPath) => {
  return fs.ensureDirAsync(labelPath)
    .then(() => wavFileInfo.infoByFilenameAsync(path))
    .then(info => fs.writeFileAsync(`${labelPath}/${file}.lbl`,
      `0 ${info.duration} sound`));
};

const parametrizeSound = (path, layer) => {
  const file = path.split('/').pop().replace('.wav', '');
  return fs.ensureDirAsync(layer.paths.prm)
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
      return arrayToRaw(vector, `${file}.prm`, `${layer.paths.prm}/`)
        .then(() => extractLabel_(path, file, layer.paths.lbl));
    });
};

module.exports = {parametrizeSound};

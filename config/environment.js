const root_ = process.cwd();
const ivCfg_ = `${root_}/cfg-ivectors`;

const workbenchCreator = (layer, fold) => {
  const workPath_ = `${layer.paths.lRoot}/work/f${fold}`;
  const aggregateClusters = Boolean(layer.aggregateClusters);

  const cfg = {
    sph: `${ivCfg_}/08_sph_ivTest_SphNorm_Plda_no_load.cfg`,
    plda: `${ivCfg_}/05_3_PLDA_ivTest_Plda.cfg`
  };

  return {
    cfg,
    fold,
    aggregateClusters,
    files: `${layer.paths.files}/f${fold}`,
    test: `${layer.paths.test}/f${fold}`,
    input: `${layer.paths.input}/f${fold}`,
    gmm: `${workPath_}/gmm`,
    prm: `${workPath_}/prm`,
    mat: `${workPath_}/mat`,
    ivRaw: `${workPath_}/iv/raw`,
    ivLenNorm: `${workPath_}/iv/length-norm`,
    scores: {
      sph: `${layer.paths.lRoot}/work/sph`,
      plda: `${layer.paths.lRoot}/work/plda`
    }
  };
};

const firstLayer = layerRootPath => {
  const wbName = 'First';
  const lRoot = `${layerRootPath}/l${wbName}`;
  const prmInput = `${root_}/prmInput/l${wbName}`;

  const clusters = ['Dishes', 'DoorClapping', 'DoorOpening',
    'ElectricalShaver', 'GlassBreaking', 'HairDryer', 'HandClapping', 'Keys',
    'Paper', 'Water'];
  const aggregateClusters = [
    ['Human', ['Breathing', 'Cough', 'FemaleCry', 'FemaleScream', 'Laugh',
      'MaleScream', 'Sneeze', 'Yawn']]
  ];

  const mfccSize = 19;
  const cfgMFCC = {
    fftSize: 256,
    bankCount: 24,
    lowFrequency: 1,
    highFrequency: 8000, // Samplerate/2 here
    sampleRate: 16000
  };

  const paths = {
    lRoot,
    input: `${lRoot}/input`,
    test: `${lRoot}/test`,
    prm: `${lRoot}/prm`,
    lbl: `${lRoot}/lbl`,
    files: `${lRoot}/files`
  };

  const cfg = {
    path: ivCfg_,
    normPRM: `${ivCfg_}/01_PRM_NormFeat.cfg`,
    ubm: `${ivCfg_}/02_UBM_TrainWorld.cfg`,
    tv: `${ivCfg_}/03_TV_TotalVariability_fast.cfg`,
    ivExtractor: `${ivCfg_}/04_ivExtractor_fast.cfg`,
    normPLDA: `${ivCfg_}/05_1_PLDA_ivNorm.cfg`,
    sph: `${ivCfg_}/08_sph_ivTest_SphNorm_Plda.cfg`,
    plda: `${ivCfg_}/05_2_PLDA_Plda.cfg`
  };

  return {
    paths,
    cfg,
    wbName,
    clusters,
    aggregateClusters,
    mfccSize,
    cfgMFCC,
    prmInput
  };
};

const humanLayer = layerRootPath => {
  const wbName = 'Human';
  const lRoot = `${layerRootPath}/l${wbName}`;
  const prmInput = `${root_}/prmInput/l${wbName}`;

  const clusters = ['Breathing', 'Cough', 'FemaleCry', 'FemaleScream', 'Laugh',
    'MaleScream', 'Sneeze', 'Yawn'];

  const useRER = true;

  const mfccSize = 19;
  const cfgMFCC = {
    fftSize: 256,
    bankCount: 24,
    lowFrequency: 1,
    highFrequency: 8000, // Samplerate/2 here
    sampleRate: 16000
  };

  const paths = {
    lRoot,
    input: `${lRoot}/input`,
    test: `${lRoot}/test`,
    prm: `${lRoot}/prm`,
    lbl: `${lRoot}/lbl`,
    files: `${lRoot}/files`
  };

  const cfg = {
    path: ivCfg_,
    normPRM: `${ivCfg_}/01_PRM_NormFeat_RER.cfg`,
    ubm: `${ivCfg_}/02_UBM_TrainWorld_RER.cfg`,
    tv: `${ivCfg_}/03_TV_TotalVariability_fast_RER.cfg`,
    ivExtractor: `${ivCfg_}/04_ivExtractor_fast_RER.cfg`,
    normPLDA: `${ivCfg_}/05_1_PLDA_ivNorm.cfg`,
    sph: `${ivCfg_}/08_sph_ivTest_SphNorm_Plda.cfg`,
    plda: `${ivCfg_}/05_2_PLDA_Plda.cfg`
  };

  return {paths, cfg, clusters, wbName, mfccSize, cfgMFCC, useRER, prmInput};
};

const loadEnvironment = () => {
  const bin_ = `${root_}/bin`;
  const layersRootPath = `${root_}/layers`;

  const ENV = {
    LOG_LEVEL: 'info',
    inputPath: `${root_}/input`,
    outputPath: `${root_}/output`,
    layersRootPath,
    firstLayer: firstLayer(layersRootPath),
    secondLayers: [humanLayer(layersRootPath)],
    workbenchCreator,
    bin: {
      normPRM: `${bin_}/01_NormFeat`,
      ubm: `${bin_}/02_TrainWorld`,
      tv: `${bin_}/03_TotalVariability`,
      ivExtractor: `${bin_}/04_IvExtractor`,
      ivNorm: `${bin_}/05_1_IvNorm`,
      plda: `${bin_}/05_2_PLDA`,
      ivTest: `${bin_}/06_IvTest`
    }
  };

  if (process.env.ENV === 'try-hard') {
    ENV.LOG_LEVEL = 'silly';
  }

  if (process.env.ENV === 'development') {
    ENV.LOG_LEVEL = 'debug';
  }

  if (process.env.ENV === 'production') {
    ENV.LOG_LEVEL = 'info';
  }

  return ENV;
};

module.exports = loadEnvironment();

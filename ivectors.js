const env = require('./config/environment');
const {
  retrieveFiles,
  parametrizeClusters
} = require('./app/learn/parametrize-clusters');

retrieveFiles(env.firstLayer)
  .then(inputFiles => parametrizeClusters(inputFiles, env.firstLayer))
  .then(() => retrieveFiles(env.secondLayers[0]))
  .then(inputFiles => parametrizeClusters(inputFiles, env.secondLayers[0]));

const logger = require('../utils/logger');
const {
  normPRM,
  createUBM,
  createTV,
  ivExtractor,
  normalizePLDA,
  createSph,
  trainPLDA,
  scoreSph,
  scorePLDA
} = require('./ivectors-tools');

const ivProcess = (layer, workbench, dnnScorer = true) => {
  return normPRM(layer, workbench)
    .then(() => createUBM(layer, workbench))
    .then(() => createTV(layer, workbench))
    .then(() => ivExtractor(layer, workbench, 'ivExtractorAll.ndx'))
    .then(() => ivExtractor(layer, workbench, 'ivExtractor.ndx'))
    .then(() => {
      if (dnnScorer) {
        return;
      }
      return normalizePLDA(layer, workbench)
        .then(() => createSph(layer, workbench))
        .then(() => trainPLDA(layer, workbench))
        .then(() => scoreSph(workbench))
        .then(() => scorePLDA(workbench));
    });
};

const threadManager = () => {
  process.send({type: 'ready'});

  process.on('message', msg => {
    switch (msg.type) {
      case 'data':
        ivProcess(msg.layer, msg.workbench, msg.dnnScorer)
          .then(() => process.send({type: 'ready'}));
        break;
      /* istanbul ignore next */
      case 'terminate':
        process.exit();
        break;
      /* istanbul ignore next */
      default:
        logger.log('error', `Child: Message not recognized : ${msg.type}`);
        process.exit();
        break;
    }
  });
};

threadManager();

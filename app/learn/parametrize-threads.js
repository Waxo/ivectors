const logger = require('../utils/logger');
const {parametrizeSound} = require('./parametrize-sound');

const threadManager = () => {
  process.send({type: 'ready'});

  process.on('message', msg => {
    switch (msg.type) {
      case 'data':
        parametrizeSound(msg.file, msg.layer, msg.output)
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

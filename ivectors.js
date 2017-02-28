const {
  parametrizeSound
} = require('./app/learn/parametrize-sound');
const env = require('./config/environment');

parametrizeSound('./input/Breathing/Breathing-00000.wav', env.firstLayer);

const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');
const {logger} = require('./logger');

const execAsync = (execute, stdoutON, stderrDisabled) => {
  return new BluebirdPromise((resolve, reject) => {
    exec(execute, {maxBuffer: 1024 * 1000}, (error, stdout, stderr) => {
      if (stderr) {
        logger.log('debug', `stderr: ${stderr}`);
        if (!stderrDisabled) {
          reject(stderr);
        }
      }
      if (error !== null) {
        logger.log('debug', `exec error: ${error}`);
      }
      if (stdoutON) {
        logger.log('info', `stdout: ${stdout}`);
      }

      resolve(stdout);
    });
  });
};

module.exports = {execAsync};

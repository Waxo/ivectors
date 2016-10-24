import {logger} from "./logger";
const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');

const execAsync = (execute, stdoutON, stderrDisabled) => {
  return new BluebirdPromise((resolve, reject) => {
    exec(execute, {maxBuffer: 1024 * 1000}, (error, stdout, stderr) => {
      let isRejected = false;
      if (stderr) {
        logger.log('warn', `stderr: ${stderr}`);
        if (!stderrDisabled) {
          reject(stderr);
        }
      }
      if (error !== null) {
        logger.log('warn', `exec error: ${error}`);
        isRejected = true;
        reject();
      }
      if (stdoutON) {
        logger.log('info', `stdout: ${stdout}`);
      }

      if (!isRejected) {
        resolve();
      }
    });
  });
};

export {execAsync};

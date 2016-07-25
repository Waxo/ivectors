const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');

const execAsync = (execute, stdoutON, stderrDisabled) => {
  return new BluebirdPromise((resolve, reject) => {
    exec(execute, {maxBuffer: 1024 * 1000}, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        if (!stderrDisabled) {
          reject(stderr);
        }
      }
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
      if (stdoutON) {
        console.log(`stdout: ${stdout}`);
      }

      resolve();
    });
  });
};

export {execAsync};

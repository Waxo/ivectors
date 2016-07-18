const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');

const execAsync = (execute, stdoutON, stderrDisabled) => {
  return new BluebirdPromise((resolve, reject) => {
    exec(execute, (error, stdout, stderr) => {
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

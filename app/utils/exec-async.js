const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');

const execAsync = (execute, stdoutON) => {
  return new BluebirdPromise((resolve, reject) => {
    exec(execute, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        reject();
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

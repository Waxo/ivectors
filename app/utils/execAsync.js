const exec = require('child_process').exec;
const BluebirdPromise = require('bluebird');

export default function execAsync(execute, stdoutON) {
  return new BluebirdPromise(resolve => {
    exec(execute, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
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
}

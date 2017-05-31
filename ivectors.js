const chalk = require('chalk');
const vorpal = require('vorpal')();
const {
  extractPRMFiles,
  tenFolds,
  testDNNScore
} = require('./app/commands');

// vorpal.delimiter(`${chalk.blue.bold('ivectors')} ${chalk.yellow.bold('#')}`)
//   .show();
//
// vorpal
//   .command('ten-folds', 'Launch the ten-fold scoring')
//   .option('-p, --prm', 'create PRM files')
//   .option('-t, --test-prm <directory>')
//   .action(args => {
//     return tenFolds(args.options.prm, args.options['test-prm']);
//   });
//
// vorpal
//   .command('parametrize', 'Extract prm into prmInput or directory given')
//   .option('-o, --output <directory>')
//   .action(args => {
//     return extractPRMFiles(args.options.output);
//   });
//
// vorpal
//   .command('dnn', 'dnn')
//   .action(() => {
//     return testDNNScore();
//   });

const BluebirdPromise = require('bluebird');
BluebirdPromise.map([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fold => testDNNScore(fold))
  .then(count => {
    console.log(count.reduce((a, b) => a + b));
  });

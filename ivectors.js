const chalk = require('chalk');
const vorpal = require('vorpal')();
const {
  extractPRMFiles,
  tenFolds
} = require('./app/commands');

vorpal.delimiter(`${chalk.blue.bold('ivectors')} ${chalk.yellow.bold('#')}`)
  .show();

vorpal
  .command('ten-folds', 'Launch the ten-fold scoring')
  .option('-p, --prm', 'use folder prmInput')
  .action(args => {
    // return tenFolds(args.options.prm);
    return tenFolds(true);
  });

vorpal
  .command('parametrize', 'Extract prm into prmInput')
  .action(() => {
    return extractPRMFiles();
  });

const chalk = require('chalk');
const vorpal = require('vorpal')();
const {
  extractPRMFiles,
  tenFolds,
  testDNNScore
} = require('./app/commands');
const {suffixChanger} = require('./app/utils/suffix-changer');

vorpal.delimiter(`${chalk.blue.bold('ivectors')} ${chalk.yellow.bold('#')}`)
  .show();

vorpal
  .command('ten-folds', 'Launch the ten-fold scoring')
  .option('-p, --prm', 'create PRM files')
  .option('-t, --test-prm <directory>')
  .action(args => {
    return tenFolds(args.options.prm, args.options['test-prm']);
  });

vorpal
  .command('parametrize', 'Extract prm into prmInput or directory given')
  .option('-o, --output <directory>')
  .action(args => {
    return extractPRMFiles(args.options.output);
  });

vorpal
  .command('dnn', 'dnn')
  .action(() => {
    return testDNNScore();
  });

vorpal
  .command('change-suffixes', 'remove suffix from files')
  .option('-d --directory <directory>', 'working directory')
  .option('-s --suffix <suffix>', 'suffix for rename')
  .action(args => {
    const workingDir = args.options.directory;
    const suffix = (args.options.suffix) ? `_${args.options.suffix}` : '';
    if (workingDir) {
      return suffixChanger(workingDir, suffix);
    }
  });

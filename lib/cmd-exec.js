const chalk = require('chalk');
const { spawn } = require('child_process');

const execCommand = ({ name, spawnProcess }) => new Promise((resolve, reject) => {
  console.log(chalk.bgRgb(128, 128, 0)(`Starting ${name}`));
  const childProcess =  spawnProcess(spawn);

  childProcess.stdout.on('data', data => console.log(data.toString()));

  childProcess.stderr.on('data', data => console.error(chalk.red(`ERR ${data.toString()}`)));

  childProcess.on('exit', code => {
    if (code === 0) {
      console.log(chalk.bgRgb(128, 128, 0)(`Success running ${name}. Finish with exit code ${code}`));
      resolve(true);
    } else {
      reject(`Error running ${name}. Finish with exit code ${code}.`);
    }
  });
})

module.exports = {
  execCommand,
};

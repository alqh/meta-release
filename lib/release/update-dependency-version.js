const chalk = require('chalk');
const { execCommand } = require('../cmd-exec');
const { dependencyTypes } = require('../dependency-types');

const getDependencyForReleasedLibraries = ({
  dependentProjectInfo,
  updatedVersion,
}) => {
  const dependenciesToBeUpdated = {};
  dependencyTypes.forEach(dependencyType => {
    const dependencyInfo = dependentProjectInfo[dependencyType];
    if (dependencyInfo) {
      Object.keys(dependencyInfo).forEach(dependency => {
        if (updatedVersion[dependency]) {
          dependenciesToBeUpdated[dependency] = {
            version: dependencyInfo[dependency].version,
            newVersion: updatedVersion[dependency]
          };
        }
      });
    }
  });

  return dependenciesToBeUpdated;
};

const bumpDependencyVersion = ({
  projectName,
  projectInfo,
  dependencyName,
  scriptType,
  newVersion,
  versionRange,
  dryRun,
 }) => {
  const { projectFolder } = projectInfo;
  const name = `Bump dependency version ${dependencyName} to ${newVersion} for ${projectName}`;
  const newVersionDescription = `${versionRange || ""}${newVersion}`;

  if (dryRun) {
    return new Promise(resolve => {
      console.log(chalk.italic(`Spawning process in ${projectFolder}`));
      if (scriptType === 'yarn') {
        console.log(chalk.italic(`yarn upgrade ${dependencyName}@${newVersionDescription}`));
      } else {
        console.log(chalk.italic(`npm install ${dependencyName}@${newVersionDescription} --save`));
      }
      resolve(newVersionDescription);
    });
  }

  let execAsync;
  if (scriptType === 'yarn') {
    execAsync = execCommand({
      name,
      spawnProcess: spawn => spawn(
        'yarn',
        [
          'upgrade',
          `${dependencyName}@${newVersionDescription}`,
        ],
        { cwd: projectFolder }
      )
    });
  } else {
    execAsync = execCommand({
      name,
      spawnProcess: spawn => spawn(
        'npm',
        [
          'install',
          `${dependencyName}@${newVersionDescription}`,
          '--save'
        ],
        { cwd: projectFolder }
      )
    });
  }

  return execAsync.then(() => newVersionDescription);
};

const updateDependencyVersion = ({
  projectName,
  projectInfo,
  dependencyName,
  scriptType,
  newVersion,
  versionRange,
  dryRun,
 }) => bumpDependencyVersion({
    projectName,
    projectInfo,
    dependencyName,
    scriptType,
    newVersion,
    versionRange,
    dryRun,
  });

module.exports = {
  getDependencyForReleasedLibraries,
  updateDependencyVersion,
};

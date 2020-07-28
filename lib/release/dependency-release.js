const chalk = require('chalk');
const { addAndCommitFiles } = require('../git/git-commit');
const { updateDependencyVersion } = require('./update-dependency-version');
const { getVersionRange } = require('../version-types');

const commitVersionChange = ({
  currentDependent,
  projectInfo,
  dependenciesBumped,
  dryRun,
}) => {
  const { projectFolder } = projectInfo;
  const message = `[deps] Bump dependences: ${dependenciesBumped.join(', ')}`;

  if (dryRun) {
    return new Promise(resolve => {
      console.log(chalk.italic(`Committing version update of ${currentDependent}`));
      console.log(chalk.italic(`\t${message}`));
      resolve(null);
    });
  }

  return addAndCommitFiles({
    repoURL: projectFolder,
    message,
    validateFile: fileStatus => {
      const filePath = fileStatus.path();
      return filePath.includes('package.json') || filePath.includes('package-lock.json') || filePath.includes('.lock');
    }
  });
};



const incrementDependencyForReleasedLibraries = ({
  dependentProjectInfo,
  currentDependent,
  dependenciesToBeUpdated,
  dryRun,
}) => new Promise(resolve => {
    console.log(chalk.cyanBright(`Checking dependent for ${currentDependent}`));

    const async = Object.keys(dependenciesToBeUpdated)
      .map(dependency => updateDependencyVersion({
                            projectName: currentDependent,
                            projectInfo: dependentProjectInfo,
                            dependencyName: dependency,
                            scriptType: 'npm',
                            newVersion: dependenciesToBeUpdated[dependency].newVersion,
                            versionRange: getVersionRange(dependenciesToBeUpdated[dependency].version),
                            dryRun,
                          }).then(newVersionDescription => `${dependency} to ${newVersionDescription}`)
      );

    resolve(
      Promise.all(async)
        .then(dependenciesBumped => commitVersionChange({
          currentDependent,
          projectInfo: dependentProjectInfo,
          dependenciesBumped,
          dryRun,
        }))
    );
  });

  module.exports = {
    incrementDependencyForReleasedLibraries,
  };

const chalk = require('chalk');
const inquirer = require('inquirer');
const semverDiff = require('semver/functions/diff');
const semverInc = require('semver/functions/inc');
const semverValid = require('semver/functions/valid');
const { addAndCommitFiles } = require('../git/git-commit');
const { versionTypes, getVersionTypeIndex } = require('../version-types');
const releaseProject = require('./release-project');
const { updateDependencyVersion, getDependencyForReleasedLibraries } = require('./update-dependency-version');

const inquireDependentsDefaultVersionIncrementType = ({ versionTypes, dependentsVersionBump }) =>
  inquirer
    .prompt([
      {
        name: 'dependentsVersionBump',
        message: 'Dependents will be increment by',
        type: 'expand',
        choices: versionTypes,
        default: getVersionTypeIndex(dependentsVersionBump),
      }
    ]);

const inquireConfirmReleaseDependent = ({ currentDependent, currentDependentVersion, newDependentVersion }) => inquirer
  .prompt([
    {
      name: 'confirmReleaseVersion',
      message: `Enter version for ${currentDependent} release (current version: ${currentDependentVersion}, suggested default: ${newDependentVersion}). Enter "n" to skip release?`,
      type: 'input',
      default: newDependentVersion,
      validate: input => {
        if (input === 'n') {
          return true;
        }
        return semverValid(input) !== null;
      },
    }
  ]);

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
  })
};

const getVersionRange = version => {
  const match = /^([^0-9]+)[0-9].*/.exec(version);
  if (match) {
    return match[1];
  }
  return '';
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

const startDependencyVersionRelease = ({
  metaProjectData,
  currentDependent,
  dependentsVersionBump,
  updatedVersion,
  dryRun,
}) => new Promise(resolve => {
  console.log('\n');
  console.log(chalk.cyan(`==============================================================================`));
  console.log(chalk.cyan(`${currentDependent}`));
  console.log(chalk.cyan(`==============================================================================`));
  const dependentProjectInfo = metaProjectData.metaProjectInfo[currentDependent];
  const currentDependentVersion = dependentProjectInfo.version;
  let newDependentVersion = currentDependentVersion;
  if (dependentsVersionBump !== 'keep') {
    newDependentVersion = semverInc(currentDependentVersion, dependentsVersionBump);
  }

  const dependenciesToBeUpdated = getDependencyForReleasedLibraries({
    dependentProjectInfo,
    updatedVersion,
  });

  if (Object.keys(dependenciesToBeUpdated).length === 0) {
    console.log(chalk.blue(`Skipping ${currentDependent} because no transitive dependency update.`));
    resolve(false);
  } else {
    const doWork = inquireConfirmReleaseDependent({
        currentDependent,
        currentDependentVersion,
        newDependentVersion,
      })
      .then(answers => {
        if (answers.confirmReleaseVersion === 'n') {
          console.log(chalk.blue(`Skipping ${currentDependent}`));
          return false;
        }
        return incrementDependencyForReleasedLibraries({
          dependentProjectInfo,
          currentDependent,
          dependenciesToBeUpdated,
          dryRun,
        })
        .then(() => releaseProject({
            projectName: currentDependent,
            projectInfo: dependentProjectInfo,
            newVersion: answers.confirmReleaseVersion,
            releaseScript: 'prepare-release',
            publishScript: 'release',
            scriptType: 'npm',
            dryRun,
          })
        ).then(() => {
            updatedVersion[currentDependent] = answers.confirmReleaseVersion;
            return true;
        });
      });

    resolve(doWork);
  }
});

const releaseMain = ({
  projectName,
  mainProjectInfo,
  projectVersion,
  dryRun,
}) => {
  console.log('\n');
  console.log(chalk.cyan(`==============================================================================`));
  console.log(chalk.cyan(`${projectName}`));
  console.log(chalk.cyan(`==============================================================================`));
  return releaseProject({
    projectName,
    projectInfo: mainProjectInfo,
    newVersion: projectVersion,
    releaseScript: 'prepare-release',
    publishScript: 'release',
    scriptType: 'npm',
    dryRun,
  });
};

const startReleaseVersion = ({
  projectName,
  projectVersion,
  metaProjectData,
  dryRun,
}) => {
  console.log(chalk.blueBright('Starting Release'));

  // dependency graph library guarantees that the direct depdendents are returned last
  const dependents = metaProjectData.dependencyGraph.dependantsOf(projectName);
  const mainProjectInfo = metaProjectData.metaProjectInfo[projectName];
  const currentProjectVersion = mainProjectInfo.version;
  const updatedVersion = {
    [projectName]: projectVersion
  };

  return releaseMain({
    projectName,
    mainProjectInfo,
    projectVersion,
    dryRun,
  })
    .then(() => {
      console.log(chalk.blueBright('Propagate Release to Dependents'));
      let dependentsVersionBump = semverDiff(currentProjectVersion, projectVersion) || 'keep';
      return inquireDependentsDefaultVersionIncrementType({
        versionTypes,
        dependentsVersionBump,
      });
    })
    .then(answers => {
      const loopDependentsAsync = dependents.reduceRight(
        (accumulator, currentDependent) =>
          accumulator
            .then(() => startDependencyVersionRelease({
                metaProjectData,
                currentDependent,
                dependentsVersionBump: answers.dependentsVersionBump,
                updatedVersion,
                dryRun,
              })
            ),
          Promise.resolve(true)
        );

        return loopDependentsAsync;
    });
};

module.exports = startReleaseVersion;

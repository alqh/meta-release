const chalk = require('chalk');
const inquirer = require('inquirer');
const semverDiff = require('semver/functions/diff');
const semverInc = require('semver/functions/inc');
const semverValid = require('semver/functions/valid');
const { incrementDependencyForReleasedLibraries } = require('../release/dependency-release');
const { versionTypes, getVersionTypeIndex } = require('../version-types');
const releaseProject = require('../release/release-project');
const { getDependencyForReleasedLibraries } = require('../release/update-dependency-version');

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

const startDependencyVersionRelease = ({
  metaProjectData,
  currentDependent,
  dependentsVersionBump,
  updatedVersion,
  dryRun,
  scriptType,
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
            scriptType,
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
  scriptType,
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
    scriptType,
    dryRun,
  });
};

const startReleaseVersion = ({
  projectName,
  projectVersion,
  metaProjectData,
  dryRun,
  scriptType,
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
    scriptType,
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
                scriptType,
              })
            ),
          Promise.resolve(true)
        );

        return loopDependentsAsync;
    });
};

module.exports = startReleaseVersion;

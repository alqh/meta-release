const chalk = require('chalk');
const inquirer = require('inquirer');
const semverInc = require('semver/functions/inc');
const semverValid = require('semver/functions/valid');
const { versionTypes, getVersionTypeIndex } = require('../version-types');
const releaseProject = require('../release/release-project');
const { getDependencyForReleasedLibraries } = require('../release/update-dependency-version');
const { incrementDependencyForReleasedLibraries } = require('../release/dependency-release');

const inquireConfirmReleaseDependent = ({ currentDependent, currentDependentVersion, newDependentVersion }) => inquirer
  .prompt([
    {
      name: 'confirmReleaseVersion',
      message: `Enter version for ${currentDependent} release (current version: ${currentDependentVersion}, suggested default: ${newDependentVersion}).
        Enter "n" to skip release, or "i" to skip release but include for dependents?`,
      type: 'input',
      default: newDependentVersion,
      validate: input => {
        if (input === 'n' || input === 'i') {
          return true;
        }
        return semverValid(input) !== null;
      },
    }
  ]);

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

const startDependencyVersionRelease = ({
  externalMetaProject,
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
  const dependentProjectInfo = externalMetaProject.metaProjectInfo[currentDependent];
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
        } else if (answers.confirmReleaseVersion === 'i') {
          updatedVersion[currentDependent] = currentDependentVersion;
          console.log(chalk.blue(`Include ${currentDependent}@${currentDependentVersion}`));
          return false;
        }
        return incrementDependencyForReleasedLibraries({
          dependentProjectInfo,
          currentDependent,
          dependenciesToBeUpdated,
          dryRun,
          scriptType,
        })
        .then(() => releaseProject({
            projectName: currentDependent,
            projectInfo: dependentProjectInfo,
            newVersion: answers.confirmReleaseVersion,
            releaseScript: 'release',
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

const startReleaseDependentVersion = ({
  externalDependency,
  externalDependencyVersion,
  externalMetaProject,
  dryRun,
  scriptType,
}) => {
  console.log(chalk.blueBright('Starting Dependent Release'));

  // dependency graph library guarantees that the direct depdendents are returned last
  const dependents = externalMetaProject.dependencyGraph.dependantsOf(externalDependency);
  const updatedVersion = {
    [externalDependency]: externalDependencyVersion
  };

  console.log(chalk.blueBright('Propagate Release to Dependents'));

  return inquireDependentsDefaultVersionIncrementType({
    versionTypes,
  })
  .then(answers => {
    const loopDependentsAsync = dependents.reduceRight(
      (accumulator, currentDependent) =>
        accumulator
          .then(() => startDependencyVersionRelease({
              externalMetaProject,
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

module.exports = startReleaseDependentVersion;

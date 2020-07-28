const inquirer = require('inquirer');
const { getExternalMetaProjectData } = require('../get-meta-project-data');
const { verifyCleanGitWorkspaces } = require('../git/git-workspace-status');
const startReleaseDependentVersion = require('./start-release-dependent-version');

const inquireProjectVersionToUse = ({ externalMetaProject, projectName }) => inquirer
  .prompt([
    {
      name: 'projectVersion',
      message: `Enter version ${projectName} to use? \n(defaults to current version in package.json)`,
      type: 'input',
      default: externalMetaProject.metaProjectInfo[projectName].version
    }
  ]);

const confirmDependenciesAffected = ({ projectName, dependentsOfProject }) => {
  const dependentsString = `\t* ${dependentsOfProject.join('\n\t*')}`;
  return inquirer
          .prompt([
            {
              name: 'confirmContinue',
              message: `Below are the dependencies of ${projectName}: \n${dependentsString} \n, Continue ?`,
              type: 'confirm',
              default: true
            }
          ]);
};

const metaReleaseDependentVersion = ({
  metaDirectory,
  metaConfig,
  projectName,
  projectVersion,
  dryRun,
}) => {
  const externalMetaProject = getExternalMetaProjectData({ metaDirectory, metaConfig });
  const dependentsOfProject = externalMetaProject.dependencyGraph.dependantsOf(projectName);

  return verifyCleanGitWorkspaces(externalMetaProject, [projectName, ...dependentsOfProject])
    .then(() => {
      if (!projectVersion) {
        return inquireProjectVersionToUse({
          externalMetaProject,
          projectName,
        });
      }
      return Promise.resolve({
        projectVersion,
      });
    })
    .then(projectVersionAnswers =>
      confirmDependenciesAffected({
        projectName,
        dependentsOfProject,
      })
        .then(confirmAnswers => ({
          ...projectVersionAnswers,
          ...confirmAnswers,
        }))
    )
    .then(answers => {
      if (answers.confirmContinue) {
        return startReleaseDependentVersion({
          externalDependency: projectName,
          externalDependencyVersion: answers.projectVersion,
          externalMetaProject,
          dryRun,
        });
      }
      return Promise.resolve(null);
    });
};

module.exports = metaReleaseDependentVersion;

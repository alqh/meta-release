const inquirer = require('inquirer');
const { getMetaProjectData } = require('../get-meta-project-data');
const { verifyCleanGitWorkspaces } = require('../git/git-workspace-status');
const startReleaseVersion = require('./start-release-version');

const inquireNewProjectVersion = ({ metaProjectData, projectName }) => inquirer
  .prompt([
    {
      name: 'projectVersion',
      message: `Enter version ${projectName} to release? \n(defaults to current version in package.json)`,
      type: 'input',
      default: metaProjectData.metaProjectInfo[projectName].version
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

const metaReleaseVersion = ({
  metaDirectory,
  metaConfig,
  projectName,
  projectVersion,
  dryRun,
  scriptType,
}) => {
  const metaProjectData = getMetaProjectData({ metaDirectory, metaConfig });
  const dependentsOfProject = metaProjectData.dependencyGraph.dependantsOf(projectName);

  return verifyCleanGitWorkspaces(metaProjectData, [projectName, ...dependentsOfProject])
    .then(() => {
      if (!projectVersion) {
        return inquireNewProjectVersion({
          metaProjectData,
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
        return startReleaseVersion({
          projectName,
          projectVersion: answers.projectVersion,
          metaProjectData,
          dryRun,
          scriptType,
        });
      }
      return Promise.resolve(null);
    });
};

module.exports = metaReleaseVersion;

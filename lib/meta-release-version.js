const inquirer = require('inquirer');
const getMetaProjectData = require('./get-meta-project-data');


const startReleaseVersion = ({
  metaDirectory,
  metaConfig,
  projectname,
  projectversion,
  metaProjectData,
}) => {
  console.log('STARTTINGGGG');
}

const metaReleaseVersion = ({
  metaDirectory,
  metaConfig,
  projectname,
  projectversion
}) => {
  const metaProjectData = getMetaProjectData({ metaDirectory, metaConfig });

  const dependentsString = `\t* ${metaProjectData.dependencyGraph.dependantsOf(projectname).join('\n\t* ')}`;
  const confirmProjectBump = {
    name: 'confirmContinue',
    message: `Below are the dependencies of ${projectname}: \n${dependentsString} \n, Continue ?`,
    type: 'confirm',
    default: true
  };

  if (!projectversion) {
    inquirer
      .prompt([
        {
          name: 'updatedProjectVersion',
          message: `Enter version ${projectname} to release?`,
          type: 'input',
          default: metaProjectData.metaProjectInfo[projectname].version
        },
        confirmProjectBump,
      ])
      .then(answers => {
        if (answers.confirmContinue) {
          return startReleaseVersion({
            metaDirectory,
            metaConfig,
            projectname,
            projectversion: answers.updatedProjectVersion,
            metaProjectData,
          });
        }
        return null;
      });
  } else {
    inquirer
      .prompt([confirmProjectBump])
      .then(answers => {
        if (answers.confirmContinue) {
          return startReleaseVersion({
            metaDirectory,
            metaConfig,
            projectname,
            projectversion,
            metaProjectData,
          });
        }
        return null;
      })
  }
};

module.exports = metaReleaseVersion;

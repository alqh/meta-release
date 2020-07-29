const chalk = require('chalk');
const { execCommand } = require('../cmd-exec');
const { pushTag } = require('../git/git-tag');
const { verifyCleanGitWorkspace } = require('../git/git-workspace-status');
const { pushCurrentBranch } = require('../git/git-branch');

const updateVersion = ({
  projectName,
  projectInfo,
  scriptType,
  newVersion,
  dryRun,
 }) => {
  const { projectFolder } = projectInfo;
  const name = `update version ${projectName} to ${newVersion}`;

  if (dryRun) {
    return new Promise(resolve => {
      console.log(chalk.italic(`Spawning process in ${projectFolder}`));
      if (scriptType === 'yarn') {
        console.log(chalk.italic(`yarn version --new-version ${newVersion} --message "[release] ${newVersion}"`));
      } else {
        console.log(chalk.italic(`npm version ${newVersion} --message "[release] ${newVersion}"`));
      }
      resolve(null);
    });
  }

  if (scriptType === 'yarn') {
    return execCommand({
      name,
      spawnProcess: spawn => spawn(
        'yarn',
        [
          'version',
          '--new-version',
          `${newVersion}`,
          '--message',
          `[release] ${newVersion}`
        ],
        { cwd: projectFolder }
      )
    });
  } else {
    return execCommand({
      name,
      spawnProcess: spawn => spawn(
        'npm',
        [
          'version',
          `${newVersion}`,
          '--message',
          `[release] ${newVersion}`
        ],
        { cwd: projectFolder }
      )
    });
  }
};

const runReleaseScript = ({
  projectName,
  projectInfo,
  releaseScript,
  scriptType,
  newVersion,
  dryRun,
}) => {
  const { projectFolder } = projectInfo;
  const name = `Releasing ${projectName}@${newVersion}`;

  if (dryRun) {
    return new Promise(resolve => {
      console.log(chalk.italic(`Spawning process in ${projectFolder}`));
      if (scriptType === 'yarn') {
        console.log(chalk.italic(`yarn ${releaseScript}`));
      } else {
        console.log(chalk.italic(`npm ${releaseScript}`));
      }
      resolve(null);
    });
  }

  if (scriptType === 'yarn') {
    return execCommand({
      name,
      spawnProcess: spawn => spawn(
        'yarn', ['run', releaseScript],
        { cwd: projectFolder }
      )
    });
  } else {
    return execCommand({
      name,
      spawnProcess: spawn => spawn(
        'npm', ['run', releaseScript],
        { cwd: projectFolder }
      )
    });
  }
};

const tagRelease = ({ projectName, projectInfo, newVersion, dryRun }) => {
  const tagName = `v${newVersion}`;
  const { projectFolder } = projectInfo;

  console.log(chalk.yellow(`Tagging ${projectName} with ${tagName}`));

  if (dryRun) {
    return new Promise(resolve => {
      console.log(chalk.italic(`Creating git tag ${tagName} in ${projectFolder}`));
      resolve(null);
    })
  } else {
    return pushCurrentBranch({
      repoURL: projectFolder,
    }).then(() => pushTag({
        repoURL: projectFolder,
        tagName
    }));
  }
};

const releaseProject = ({
  projectName,
  projectInfo,
  newVersion,
  releaseScript,
  scriptType,
  dryRun,
 }) => {
  console.log(chalk.cyanBright(`Releasing ${projectName}@${newVersion}`));

  return verifyCleanGitWorkspace({
      currentProjectName: projectName,
      repoURL: projectInfo.projectFolder,
      dryRun,
    })
    .then(() => updateVersion({
        projectName,
        projectInfo,
        scriptType,
        newVersion,
        dryRun,
      })
    )
    .then(() => runReleaseScript({
        projectName,
        projectInfo,
        releaseScript,
        scriptType,
        newVersion,
        dryRun,
      })
    )
    .then(() => tagRelease({
        projectName,
        projectInfo,
        newVersion,
        dryRun,
      })
    );
};

module.exports = releaseProject;

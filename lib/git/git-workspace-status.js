const NodeGit = require('nodegit');

const verifyCleanGitWorkspace = ({ currentProjectName, repoURL }) =>
  NodeGit.Repository.open(repoURL)
    .then(repo =>
      repo.getStatus()
        .then(statuses => {
          if (statuses.length > 0) {
            return Promise.reject(`Uncommitted changes in ${currentProjectName}`);
          }
          return true;
        })
  );

const verifyCleanGitWorkspaces = (metaProjectData, projectsToCheck) => {
  const workspaceCheckAsync = projectsToCheck.map(currentProjectName => {
    console.log(`Checking git workspace ${currentProjectName}`);
    const repoURL = metaProjectData.metaProjectInfo[currentProjectName].projectFolder;

    return verifyCleanGitWorkspace({ currentProjectName, repoURL });
  })

  return Promise.all(workspaceCheckAsync);
};


module.exports = {
  verifyCleanGitWorkspace,
  verifyCleanGitWorkspaces,
}

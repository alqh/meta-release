const NodeGit = require('nodegit');

const pushCurrentBranch = ({ repoURL }) =>
  NodeGit.Repository.open(repoURL)
    .then(repo =>
      repo.getCurrentBranch()
      .then(currentBranchReference => repo.getRemote('origin')
        .then(remote => {
          const branchName = currentBranchReference.shorthand();
          return remote.push(
            [`refs/heads/${branchName}:refs/heads/${branchName}`],
            {
              callbacks: {
                credentials: (url, userName) => NodeGit.Cred.sshKeyFromAgent(userName)
              }
            }
          );
        })
      )
    );

module.exports = {
  pushCurrentBranch,
};

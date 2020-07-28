const NodeGit = require('nodegit');

const pushTag = ({ repoURL, tagName }) =>
  NodeGit.Repository.open(repoURL)
    .then(repo =>
      repo.getRemote('origin')
        .then(remote => remote.push(
            [`refs/tags/${tagName}:refs/tags/${tagName}`],
            {
              callbacks: {
                credentials: (url, userName) => NodeGit.Cred.sshKeyFromAgent(userName)
              }
            }
          ))
      );

const createTagAndPush = ({ repoURL, tagName }) =>
  NodeGit.Repository.open(repoURL)
    .then(repo =>
      NodeGit.lookup(repo, 'HEAD')
        .then(headOID => repo.createTag(headOID, tagName))
        .then(tag =>
          repo.getRemote('origin')
            .then(remote => remote.push(
              [`refs/tags/${tag.name()}:refs/tags/${tag.name()}`],
              {
                callbacks: {
                  credentials: (url, userName) => NodeGit.Cred.sshKeyFromAgent(userName)
                }
              }
            ))
        )
    );

  module.exports = {
    pushTag,
    createTagAndPush,
  };

const NodeGit = require('nodegit');
const { execCommand } = require('../cmd-exec');

const addAndCommitFiles = ({ repoURL, message, validateFile }) =>
  NodeGit.Repository.open(repoURL)
    .then(repo =>
      repo.getStatus()
        .then(statuses => statuses.filter(status => !validateFile || validateFile(status)))
        .then(filesToAdd =>
          repo.index()
            .then(index => {
              console.log('Staging files to commit');
              const addAsync = filesToAdd.map(addFile => index.addByPath(addFile.path()));
              return Promise.all(addAsync)
                .then(() => console.log('Complete staging files'))
                .then(() => index.write())
                .then(() => index.writeTree())
            })
            .then(index => index.write().then(() => index))
            .then(() => {
              console.log(`Committing staged files in ${repoURL}`)
              // do command line commit cause nodegit commit requires a bunch of useless things
              // that does not match what a user will do if they had done it from cli
              return execCommand({
                name: `Commit ${repoURL}`,
                spawnProcess: spawn => spawn(
                  'git',
                  [
                    `commit `,
                    '-m',
                    `"${message}"`
                  ],
                  { cwd: repoURL }
                )
              });
            })
        )
    );

module.exports = {
  addAndCommitFiles,
};

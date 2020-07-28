module.exports.register = (program) => {

  program
      .command('release-version', 'Release a version of the project and update all dependent projects')
      .command('release-dependent-version', 'Update and release dependent projects');
}

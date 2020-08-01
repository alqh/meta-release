# Meta Release
Plugin to [meta](https://github.com/mateodelnorte/meta) that will cascade publish meta projects.

![Meta Release Build and Test Package](https://github.com/alqh/meta-release/workflows/Meta%20Release%20Build%20and%20Test%20Package/badge.svg)

## Setup projects
The Meta Release plugin will use the following package scripts:

* `release` - Run to publish the package, generally this is the standard publish command

According to npm scripts, it will do the `prerelease` and `postrelease` if exists.

To install the plugin:
```
npm install --save meta-release
```

## Commands

### Release new project version and release project's dependents
This command will bump the version of the specified project, then look into the meta setup to find for dependent projects.
This also include transitive dependencies, where if A is the project with new version and B is a dependent of A and it is also released, then any dependents of C will also be included.

To run
```
meta release-version <projectName> [projectVersion]
```

Use the `-h` flag to see all options (including dry-run).

### Update projects with dependents on a library
This command will bump the version of a specified project / dependency, then look into the meta setup to find for dependent projects.
This is useful if the first command fails on some projects, and you have manually fix that particular failing project, and want to continue to it's dependents. For those projects that were already in your release path, ensure that you select "i" to include them or the transitive dependency will not be included in release.

To run
```
meta release-dependentVersion <projectName> [projectVersion]
```

Use the `-h` flag to see all options (including dry-run).

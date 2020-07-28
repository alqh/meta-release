const path = require('path');
const DepGraph = require('dependency-graph').DepGraph;
const { dependencyTypes } = require('./dependency-types');

const addDependencies = ({ projectPackageJSON, dependencyType, dependencyInfo }) => {
  if (projectPackageJSON[dependencyType]) {
    if (!dependencyInfo[dependencyType]) {
      dependencyInfo[dependencyType] = {};
    }

    Object.keys(projectPackageJSON[dependencyType]).forEach(depName => {
      dependencyInfo[dependencyType][depName] = {
        version: projectPackageJSON[dependencyType][depName]
      };
    });
  }
};

const setupProjectInfo = ({ metaConfig, metaDirectory, dependencyGraph, metaProjectInfo}) => {
  Object.keys(metaConfig.projects).forEach(projectFolder => {
    const projectPackageJSON = require(path.join(metaDirectory, projectFolder, 'package.json'));
    dependencyGraph.addNode(projectPackageJSON.name);
    metaProjectInfo[projectPackageJSON.name] = {
      version:  projectPackageJSON.version,
      projectFolder: path.join(metaDirectory, projectFolder),
    };

    dependencyTypes.forEach(
      dependencyType => {
        addDependencies({
          projectPackageJSON,
          dependencyType,
          dependencyInfo: metaProjectInfo[projectPackageJSON.name],
        });
      }
    );
  });
};

const getExternalMetaProjectData = ({ metaDirectory, metaConfig, externalDependency }) => {
  const dependencyGraph = new DepGraph();
  const metaProjectInfo = {};

  setupProjectInfo({
    metaConfig,
    metaDirectory,
    dependencyGraph,
    metaProjectInfo,
  });

  Object.keys(metaProjectInfo).forEach(projectName => {
    dependencyTypes.forEach(dependencyType => {
      const currentDependenciesForType = metaProjectInfo[projectName][dependencyType];
      if (currentDependenciesForType) {
        Object.keys(currentDependenciesForType).forEach(
          dependencyName => {
            if (metaProjectInfo[dependencyName] || externalDependency === dependencyName) {
              dependencyGraph.addDependency(projectName, dependencyName);
            }
          }
        );
      }
    });
  });

  return {
    dependencyGraph,
    metaProjectInfo,
  };
};

const getMetaProjectData = ({ metaDirectory, metaConfig }) => {
  const dependencyGraph = new DepGraph();
  const metaProjectInfo = {};

  setupProjectInfo({
    metaConfig,
    metaDirectory,
    dependencyGraph,
    metaProjectInfo,
  });

  Object.keys(metaProjectInfo).forEach(projectName => {
    dependencyTypes.forEach(dependencyType => {
      const currentDependenciesForType = metaProjectInfo[projectName][dependencyType];
      if (currentDependenciesForType) {
        Object.keys(currentDependenciesForType).forEach(
          dependencyName => {
            if (metaProjectInfo[dependencyName]) {
              dependencyGraph.addDependency(projectName, dependencyName);
            }
          }
        );
      }
    });
  });

  return {
    dependencyGraph,
    metaProjectInfo,
  };
};

module.exports = {
  getExternalMetaProjectData,
  getMetaProjectData,
};

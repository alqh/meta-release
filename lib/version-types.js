const versionTypes = [
  {
    key: 'j',
    name: 'major (1.0.0)',
    value: 'major'
  },
  {
    key: 'n',
    name: 'minor (0.1.0)',
    value: 'minor'
  },
  {
    key: 'p',
    name: 'patch (0.0.1)',
    value: 'patch'
  },
  {
    key: 'a',
    name: 'premajor (1.0.0-0)',
    value: 'premajor'
  },
  {
    key: 'b',
    name: 'preminor (0.1.0-0)',
    value: 'preminor'
  },
  {
    key: 'c',
    name: 'prepatch (0.0.1-0)',
    value: 'prepatch'
  },
  {
    key: 'r',
    name: 'prerelease (0.0.0-1)',
    value: 'prerelease'
  },
  {
    key: 'k',
    name: 'keep existing',
    value: 'keep'
  }
];

const getVersionTypeKey = value => {
  const matches = versionTypes.filter(type => type.value === value);
  return matches.length > 0 ? matches[0].key : null;
};

const getVersionTypeIndex = value => {
  let matchIndex = -1;
  versionTypes.forEach((type, index) => {
    if (type.value === value) {
      matchIndex = index;
    }
  });
  return matchIndex;
}

module.exports = {
  versionTypes,
  getVersionTypeKey,
  getVersionTypeIndex,
};

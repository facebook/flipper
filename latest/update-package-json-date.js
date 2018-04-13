//Copyright 2004-present Facebook. All Rights Reserved.

const fs = require('fs');
const path = require('path');

const packageLoc = path.join(__dirname, '..', 'package.json');

// $FlowFixMe
const pkg = require(packageLoc);
pkg.versionDate = new Date().toLocaleDateString();
fs.writeFileSync(packageLoc, JSON.stringify(pkg, null, '  ') + '\n');

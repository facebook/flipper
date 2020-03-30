/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @ts-check
 */

const fs = require('fs-extra');
const path = require('path');

const isFB = fs.pathExistsSync(path.resolve(__dirname, '..', 'static', 'fb'));

module.exports = isFB;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @ts-check
 */

const fs = require('fs-extra');
const path = require('path');

// Only used once at startup.
// eslint-disable-next-line node/no-sync
const isFB = fs.pathExistsSync(path.resolve(__dirname, 'fb'));

module.exports = isFB;

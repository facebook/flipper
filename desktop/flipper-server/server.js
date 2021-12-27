#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable */

// flipper-server uses the same infra & babel transforms as Electron
// to make sure our own sources are bundled up, but node modules arent
global.electronRequire = require;
require('./dist/index.js');

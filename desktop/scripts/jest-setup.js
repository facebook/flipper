/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// import/no-unresolved complains, although it is a perfectly fine import
// eslint-disable-next-line
global.fetch = require('jest-fetch-mock');

require('immer').enableMapSet();

require('../app/src/fb-stubs/Logger').init(undefined, {isTest: true});

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const defaultConsoleError = console.error;

console.error = function(message, ...args) {
  defaultConsoleError(
    'console.error used in a test. This will be an error in the near future.',
  );
  defaultConsoleError(...args);
};

global.fetch = require('jest-fetch-mock');

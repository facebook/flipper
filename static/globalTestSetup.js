/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
const defaultConsoleError = console.error;

console.error = function(message) {
  defaultConsoleError(
    'console.error used in a test. This will be an error in the near future.',
  );
  defaultConsoleError.apply(console, arguments);
};

global.fetch = require('jest-fetch-mock');

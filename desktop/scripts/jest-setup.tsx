/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// import/no-unresolved complains, although it is a perfectly fine import
// eslint-disable-next-line
(global as any).fetch = require('jest-fetch-mock');

// make sure test run everywhere in the same timezone!
// +11, somewhere in the middle of nowhere, so this deviates for everyone and will fail early :)
const timezone = 'Pacific/Pohnpei';
if (process.env.TZ !== timezone) {
  throw new Error(
    `Test started in the wrong timezone, got ${process.env.TZ}, but expected ${timezone}. Please use the package.json commands to start Jest, or prefix the command with TZ=${timezone}`,
  );
}

// Make sure we have identical formatting of Dates everywhere
const toLocaleString = Date.prototype.toLocaleString;
// eslint-disable-next-line no-extend-native
(Date as any).prototype.toLocaleString = function (
  _locale: any,
  ...args: any[]
) {
  return toLocaleString.call(this, 'en-US', ...args);
};

require('immer').enableMapSet();

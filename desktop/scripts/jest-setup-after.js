/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// jest-setup-after will run after Jest has been initialized, so that it can be adapted.

const test = global.test;
if (!test) {
  throw new Error('Failed jest test object');
}
/**
 * This test will not be executed on Github / SandCastle,
 * since, for example, it relies on precise timer reliability
 */
test.local = function local() {
  const fn = process.env.SANDCASTLE || process.env.CI ? test.skip : test;
  // eslint-disable-next-line
  return fn.apply(null, arguments);
};

/**
 * This test will only run on non-windows machines
 */
test.unix = function local() {
  const fn = process.platform === 'win32' ? test.skip : test;
  // eslint-disable-next-line
  return fn.apply(null, arguments);
};

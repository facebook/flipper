/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {transform} from '@babel/core';
const electronRequiresMainPlugin = require('../electron-requires-main');

const babelOptions = {
  ast: true,
  plugins: [electronRequiresMainPlugin],
  filename: 'index.js',
};

const testCase1 = "const module = require('module');";
test(testCase1, () => {
  const src = testCase1;
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(
    `"const module = electronRequire('module');"`,
  );
});

const testCase2 = "const module = require('./module');";
test(testCase2, () => {
  const src = testCase2;
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(`"const module = require('./module');"`);
});

const testCase3 = "const module = require('../module');";
test(testCase3, () => {
  const src = testCase3;
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(`"const module = require('../module');"`);
});

const testCase4 = "const path = require.resolve('module');";
test(testCase4, () => {
  const src = testCase4;
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(
    `"const path = electronRequire.resolve('module');"`,
  );
});

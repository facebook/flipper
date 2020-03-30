/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {transform} from '@babel/core';
const electronProcess = require('../electron-process');

const babelOptions = {
  ast: true,
  plugins: [electronProcess],
  filename: 'index.js',
};

test('transform "process.exit(0);"', () => {
  const src = 'process.exit(0);';
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(`"electronProcess.exit(0);"`);
});

test('transform "global.process.exit(0);"', () => {
  const src = 'global.process.exit(0);';
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(`"global.electronProcess.exit(0);"`);
});

test('transform "process.ENV.TEST = "true";"', () => {
  const src = 'process.ENV.TEST = "true";';
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(
    `"electronProcess.ENV.TEST = \\"true\\";"`,
  );
});

test('do not transform if process bound in an upper scope', () => {
  const src = `
    const process = {};
    for (const i=0; i<10; i++) {
      process.ENV[i] = i;
    }
    `;
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(`
    "const process = {};

    for (const i = 0; i < 10; i++) {
      process.ENV[i] = i;
    }"
  `);
});

test('do not transform if process bound to the current scope', () => {
  const src = `
    const process = {};     
    process.ENV.TEST = "true";
    `;
  const code = transform(src, babelOptions)!.code;
  expect(code).toMatchInlineSnapshot(`
    "const process = {};
    process.ENV.TEST = \\"true\\";"
  `);
});

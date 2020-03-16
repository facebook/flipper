/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {transform} from '@babel/core';
import electronStubs from '../electron-stubs';

const babelOptions = {
  ast: true,
  plugins: [electronStubs],
  filename: 'index.js',
};

test('transform electron requires to inlined stubs', () => {
  const src = 'require("electron")';
  const transformed = transform(src, babelOptions).ast;
  const body = transformed.program.body[0];
  expect(body.type).toBe('ExpressionStatement');
  expect(body.expression.properties.map(p => p.key.name)).toContain('remote');
});

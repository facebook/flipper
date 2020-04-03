/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {parse} from '@babel/parser';
import {transformFromAstSync} from '@babel/core';
import {default as generate} from '@babel/generator';
const flipperRequires = require('../flipper-requires');

const babelOptions = {
  ast: true,
  plugins: [flipperRequires],
  filename: 'index.js',
};

test('transform react requires to global object', () => {
  const src = 'require("react")';
  const ast = parse(src);
  const transformed = transformFromAstSync(ast, src, babelOptions)!.ast;
  const {code} = generate(transformed!);
  expect(code).toBe('global.React;');
});

test('transform react-dom requires to global object', () => {
  const src = 'require("react-dom")';
  const ast = parse(src);
  const transformed = transformFromAstSync(ast, src, babelOptions)!.ast;
  const {code} = generate(transformed!);
  expect(code).toBe('global.ReactDOM;');
});

test('transform flipper requires to global object', () => {
  const src = 'require("flipper")';
  const ast = parse(src);
  const transformed = transformFromAstSync(ast, src, babelOptions)!.ast;
  const {code} = generate(transformed!);
  expect(code).toBe('global.Flipper;');
});

test('transform React identifier to global.React', () => {
  const src = 'React;';
  const ast = parse(src);
  const transformed = transformFromAstSync(ast, src, babelOptions)!.ast;
  const {code} = generate(transformed!);
  expect(code).toBe('global.React;');
});

test('throw error when requiring outside the plugin', () => {
  const src = 'require("../test.js")';
  const ast = parse(src);
  expect(() => {
    transformFromAstSync(ast, src, babelOptions);
  }).toThrow();
});

test('allow requiring from parent folder as long as we stay in plugin folder', () => {
  const src = 'require("../test.js")';
  const ast = parse(src);
  const transformed = transformFromAstSync(ast, src, {
    ...babelOptions,
    root: '/path/to/plugin',
    filename: '/path/to/plugin/subfolder/index.js',
  })!.ast;
  const {code} = generate(transformed!);
  expect(code).toBe('require("../test.js");');
});

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const generate = require('babel-generator').default;
const babylon = require('babylon');
const babel = require('babel-core');
const metro = require('metro');

exports.transform = function({
  filename,
  options,
  src,
  plugins: defaultPlugins,
}) {
  const presets = [];

  let ast = babylon.parse(src, {
    filename,
    plugins: ['jsx', 'flow', 'classProperties', 'objectRestSpread'],
    sourceType: filename.includes('node_modules') ? 'script' : 'module',
  });

  // run babel
  const plugins = [
    ...defaultPlugins,
    require('./babel-plugins/electron-requires.js'),
    require('./babel-plugins/dynamic-requires.js'),
  ];
  if (!filename.includes('node_modules')) {
    plugins.unshift(require('babel-plugin-transform-es2015-modules-commonjs'));
  }
  ast = babel.transformFromAst(ast, src, {
    babelrc: !filename.includes('node_modules'),
    code: false,
    comments: false,
    compact: false,
    filename,
    plugins,
    presets,
    sourceMaps: true,
  }).ast;

  const result = generate(
    ast,
    {
      filename,
      sourceFileName: filename,
      sourceMaps: true,
    },
    src,
  );

  return {
    ast,
    code: result.code,
    filename,
    map: result.rawMappings.map(metro.sourceMaps.compactMapping),
  };
};

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const generate = require('@babel/generator').default;
const babylon = require('babylon');
const babel = require('@babel/core');
const metro = require('metro');

exports.transform = function({filename, options, src}) {
  const presets = [require('../node_modules/babel-preset-react')];
  const isSonarPlugin = !__dirname.startsWith(options.projectRoot);

  let ast = babylon.parse(src, {
    filename,
    plugins: ['jsx', 'flow', 'classProperties', 'objectRestSpread'],
    sourceType: 'module',
  });

  // run babel
  const plugins = [
    require('../node_modules/babel-plugin-transform-object-rest-spread'),
    require('../node_modules/babel-plugin-transform-class-properties'),
    require('../node_modules/babel-plugin-transform-flow-strip-types'),
    require('./electron-requires.js'),
    require('./fb-stubs.js'),
    require('./dynamic-requires.js'),
  ];
  if (isSonarPlugin) {
    plugins.push(require('./sonar-requires.js'));
  } else {
    plugins.push(require('./import-react.js'));
  }
  plugins.unshift(require('babel-plugin-transform-es2015-modules-commonjs'));

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

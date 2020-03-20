/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const generate = require('@babel/generator').default;
const babylon = require('@babel/parser');
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

function transform({filename, options, src}) {
  const isTypeScript = filename.endsWith('.tsx') || filename.endsWith('.ts');
  const presets = [require('@babel/preset-react')];

  const ast = babylon.parse(src, {
    filename,
    plugins: isTypeScript
      ? [
          'jsx',
          'typescript',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator',
        ]
      : [
          'jsx',
          ['flow', {all: true}],
          'classProperties',
          'objectRestSpread',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
    sourceType: 'module',
  });

  // run babel
  const plugins = [];

  if (!isTypeScript) {
    plugins.push(
      require('@babel/plugin-transform-modules-commonjs'),
      require('@babel/plugin-proposal-object-rest-spread'),
      require('@babel/plugin-proposal-class-properties'),
      require('@babel/plugin-transform-flow-strip-types'),
      require('@babel/plugin-proposal-optional-chaining'),
      require('@babel/plugin-proposal-nullish-coalescing-operator'),
      require('./dynamic-requires.js'),
    );
  } else {
    plugins.push(
      require('@babel/plugin-transform-typescript'),
      require('@babel/plugin-proposal-class-properties'),
      require('@babel/plugin-transform-modules-commonjs'),
      require('@babel/plugin-proposal-optional-chaining'),
      require('@babel/plugin-proposal-nullish-coalescing-operator'),
    );
  }

  if (
    fs.existsSync(
      path.resolve(path.dirname(path.dirname(__dirname)), 'app', 'src', 'fb'),
    )
  ) {
    plugins.push(require('./fb-stubs.js'));
  }
  if (!options.isTestRunner) {
    // Replacing require statements with electronRequire to prevent metro from
    // resolving them. electronRequire are resolved during runtime by electron.
    // As the tests are not bundled by metro and run in @jest-runner/electron,
    // electron imports are working out of the box.
    plugins.push(require('./electron-requires'));
  }
  plugins.push(require('./flipper-requires.js'));
  const transformed = babel.transformFromAst(ast, src, {
    ast: true,
    babelrc: !filename.includes('node_modules'),
    code: false,
    comments: false,
    compact: false,
    root: options.projectRoot,
    filename,
    plugins,
    presets,
    sourceMaps: true,
    retainLines: !!options.isTestRunner,
  });
  const result = generate(
    transformed.ast,
    {
      filename,
      sourceFileName: filename,
      sourceMaps: true,
      retainLines: !!options.isTestRunner,
    },
    src,
  );
  return {
    ast: transformed.ast,
    code: result.code,
    filename,
    map: result.map,
  };
}

module.exports = {
  transform,
  // Disable caching of babel transforms all together. We haven't found a good
  // way to cache our transforms, as they rely on side effects like env vars or
  // the existence of folders in the file system.
  getCacheKey: () => Math.random().toString(36),
  process(src, filename, config, options) {
    return transform({
      src,
      filename,
      config,
      options: {...options, isTestRunner: true},
    });
  },
};

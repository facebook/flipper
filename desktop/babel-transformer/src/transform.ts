/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as generate} from '@babel/generator';
import {parse, ParserPlugin} from '@babel/parser';
import {transformFromAstSync} from '@babel/core';
import {default as flipperEnv} from './flipper-env';
import {resolve} from 'path';

const jsParsePlugins: ParserPlugin[] = [
  'jsx',
  ['flow', {all: true}],
  'classProperties',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
];
const tsParsePluins: ParserPlugin[] = [
  'jsx',
  'typescript',
  'classProperties',
  'optionalChaining',
  'nullishCoalescingOperator',
];
const commonJsPlugin = [
  require('@babel/plugin-transform-modules-commonjs'),
  {
    strictMode: false,
  },
];
const classPropertiesPlugin = require('@babel/plugin-proposal-class-properties');
const optionalChainingPlugin = require('@babel/plugin-proposal-optional-chaining');
const coalescingOperatorPlugin = require('@babel/plugin-proposal-nullish-coalescing-operator');
const objectRestSpreadPlugin = require('@babel/plugin-proposal-object-rest-spread');
const flowStripTypesPlugin = require('@babel/plugin-transform-flow-strip-types');
const dynamicRequiresPlugin = require('./dynamic-requires');
const typeScriptPlugin = require('@babel/plugin-transform-typescript');
const emotionPlugin = require('babel-plugin-emotion');
const tsTransformPlugins = [
  typeScriptPlugin,
  classPropertiesPlugin,
  commonJsPlugin,
  optionalChainingPlugin,
  coalescingOperatorPlugin,
  // Sourcemap disabled because
  // https://github.com/electron/electron/issues/17772#issuecomment-570795784
  // https://github.com/emotion-js/emotion/issues/1838
  [emotionPlugin, {autoLabel: true, sourceMap: false}],
];
const jsTransformPlugins = [
  commonJsPlugin,
  objectRestSpreadPlugin,
  classPropertiesPlugin,
  flowStripTypesPlugin,
  optionalChainingPlugin,
  coalescingOperatorPlugin,
  dynamicRequiresPlugin,
  [emotionPlugin, {autoLabel: true, sourceMap: false}],
];

export default function transform({
  filename,
  options,
  src,
  presets,
  plugins,
}: {
  filename: string;
  options: any;
  src: string;
  presets?: any[];
  plugins?: any[];
}) {
  filename = resolve(options.projectRoot, filename);
  presets = presets ?? [require('@babel/preset-react')];
  plugins = plugins ?? [];
  const isTypeScript = filename.endsWith('.tsx') || filename.endsWith('.ts');
  const ast = parse(src, {
    sourceFilename: filename,
    plugins: isTypeScript ? tsParsePluins : jsParsePlugins,
    sourceType: 'module',
  });
  const transformed = transformFromAstSync(ast, src, {
    ast: true,
    babelrc: !filename.includes('node_modules'),
    code: false,
    comments: false,
    compact: false,
    root: options.projectRoot,
    filename,
    plugins: [
      ...(isTypeScript ? tsTransformPlugins : jsTransformPlugins),
      ...plugins,
    ],
    presets,
    sourceMaps: true,
    retainLines: !!flipperEnv.FLIPPER_TEST_RUNNER,
  });
  if (!transformed) {
    throw new Error('Failed to transform');
  }
  const result = generate(
    transformed.ast!,
    {
      filename,
      sourceFileName: filename,
      sourceMaps: true,
      retainLines: !!flipperEnv.FLIPPER_TEST_RUNNER,
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

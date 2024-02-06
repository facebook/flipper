/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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

const jsParsePlugins: ParserPlugin[] = ['jsx'];
const tsParsePluins: ParserPlugin[] = ['jsx', 'typescript'];
const commonJsPlugin = [
  require('@babel/plugin-transform-modules-commonjs'),
  {
    strictMode: false,
  },
];
const dynamicRequiresPlugin = require('./dynamic-requires');
const typeScriptPlugin = require('@babel/plugin-transform-typescript');
const emotionPlugin = require('@emotion/babel-plugin');
const tsTransformPlugins = [
  typeScriptPlugin,
  commonJsPlugin,
  // Sourcemap disabled because
  // https://github.com/emotion-js/emotion/issues/1838
  [emotionPlugin, {autoLabel: 'always', sourceMap: false}],
];
const jsTransformPlugins = [
  commonJsPlugin,
  dynamicRequiresPlugin,
  [emotionPlugin, {autoLabel: 'always', sourceMap: false}],
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
    // TODO: Fix this the next time the file is edited.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

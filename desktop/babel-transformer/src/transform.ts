/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as generate} from '@babel/generator';
import {parse} from '@babel/parser';
import {transformFromAstSync} from '@babel/core';
import {default as flipperEnv} from './flipper-env';
import {resolve} from 'path';

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
  const commonJs = [
    require('@babel/plugin-transform-modules-commonjs'),
    {
      strictMode: false,
    },
  ];
  if (!isTypeScript) {
    plugins.unshift(
      commonJs,
      require('@babel/plugin-proposal-object-rest-spread'),
      require('@babel/plugin-proposal-class-properties'),
      require('@babel/plugin-transform-flow-strip-types'),
      require('@babel/plugin-proposal-optional-chaining'),
      require('@babel/plugin-proposal-nullish-coalescing-operator'),
      require('./dynamic-requires'),
    );
  } else {
    plugins.unshift(
      require('@babel/plugin-transform-typescript'),
      require('@babel/plugin-proposal-class-properties'),
      commonJs,
      require('@babel/plugin-proposal-optional-chaining'),
      require('@babel/plugin-proposal-nullish-coalescing-operator'),
    );
  }
  const ast = parse(src, {
    sourceFilename: filename,
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
  const transformed = transformFromAstSync(ast, src, {
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

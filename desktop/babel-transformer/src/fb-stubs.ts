/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {CallExpression} from '@babel/types';
import {NodePath} from '@babel/traverse';

const isFBFile = (filePath: string) =>
  filePath.includes(`${path.sep}fb${path.sep}`);

const requireFromFolder = (folder: string, path: string) =>
  new RegExp(folder + '/[\w.-_]+(.js)?$', 'g').test(path);

module.exports = () => ({
  name: 'replace-fb-stubs',
  visitor: {
    CallExpression(path: NodePath<CallExpression>, state: any) {
      if (
        path.node.type === 'CallExpression' &&
        path.node.callee.type === 'Identifier' &&
        path.node.callee.name === 'require' &&
        path.node.arguments.length > 0 &&
        path.node.arguments[0].type === 'StringLiteral'
      ) {
        if (
          requireFromFolder('fb', path.node.arguments[0].value) &&
          !isFBFile(state.file.opts.filename)
        ) {
          throw new Error(
            'For files which are not under fb/ do not require directly from fb/, but rather from fb-stubs/ to not break flow-typing and make sure stubs are up-to-date.',
          );
        } else if (
          requireFromFolder('fb-stubs', path.node.arguments[0].value)
        ) {
          path.node.arguments[0].value = path.node.arguments[0].value.replace(
            '/fb-stubs/',
            '/fb/',
          );
        }
      }
    },
  },
});

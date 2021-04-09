/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {resolve, dirname, sep} from 'path';
import env from './flipper-env';
import {CallExpression} from '@babel/types';
import {NodePath} from '@babel/traverse';
import fs from 'fs-extra';

const isFBFile = (filePath: string) => filePath.includes(`${sep}fb${sep}`);

const requireFromFolder = (folder: string, path: string) =>
  new RegExp(folder + '/[\\w.-]+(.js)?$', 'g').test(path);

const pathExistsCache = new Map<string, boolean>();

function pathExistsSync(path: string): boolean {
  const cachedResult = pathExistsCache.get(path);
  if (cachedResult !== undefined) {
    return cachedResult;
  }
  const result = fs.pathExistsSync(path);
  pathExistsCache.set(path, result);
  return result;
}

module.exports = () => ({
  name: 'replace-fb-stubs',
  visitor: {
    CallExpression(path: NodePath<CallExpression>, state: any) {
      if (
        env.FLIPPER_FORCE_PUBLIC_BUILD !== 'true' &&
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
            'For files which are not under fb/ do not require directly from fb/, but rather from fb-stubs/ to not break typescript-typing and make sure stubs are up-to-date.',
          );
        } else if (
          requireFromFolder('fb-stubs', path.node.arguments[0].value)
        ) {
          const fbPath = path.node.arguments[0].value.replace(
            '/fb-stubs/',
            '/fb/',
          );
          if (
            env.FLIPPER_FB ||
            pathExistsSync(
              resolve(
                dirname(state.file.opts.filename),
                fbPath.substr(0, fbPath.indexOf('/fb/') + 4),
              ),
            )
          ) {
            path.node.arguments[0].value = fbPath;
          }
        }
      }
    },
  },
});

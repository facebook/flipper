/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {resolve, dirname, join} from 'path';
import fs from 'fs-extra';
import {TSESTree} from '@typescript-eslint/experimental-utils';
import {createESLintRule} from '../utils/createEslintRule';

const rootDirs = new Map<string, string>();
function findRootDir(path: string): string {
  const cachedRoot = rootDirs.get(path);
  if (cachedRoot) {
    return cachedRoot;
  }
  // Our public packages have the following structure:
  // - package
  //   - fb
  //     - package.json
  //   - pacakage.json
  // package.json insode of fb folder is not a real root. It is merely an add-on for the root package.json for internal builds.
  // We should ignore package.json inside of "fb" folder and allow relative imports from the root inside of the fb folder.
  const fbFolder = path.endsWith('fb') || path.endsWith('fb/');
  if (!fbFolder && fs.pathExistsSync(join(path, 'package.json'))) {
    rootDirs.set(path, path);
    return path;
  }
  const parentRoot = findRootDir(dirname(path));
  rootDirs.set(path, parentRoot);
  return parentRoot;
}

type Options = [];

export type MessageIds = 'noRelativeImportsAcrossPackages';
export const RULE_NAME = 'no-relative-imports-across-packages';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: `Ensure that package boundaries are respected within monorepo`,
      recommended: 'error',
    },
    schema: [],
    messages: {
      noRelativeImportsAcrossPackages: `Attempted to require "{{requiredPath}}" from file "{{filename}}" resolved to "{{resolvedPath}}" which is outside the package root dir "{{root}}".`,
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename();
    const dir = dirname(filename);
    const root = findRootDir(dir);
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (typeof node.source.value === 'string') {
          const requiredPath = node.source.value;
          const resolvedPath = resolve(dir, requiredPath);
          if (
            // imported a file not a package
            requiredPath.startsWith('.') &&
            // the resolved path for the imported file is outside the package root
            !resolvedPath.startsWith(root)
          ) {
            context.report({
              node,
              messageId: 'noRelativeImportsAcrossPackages',
              data: {
                filename,
                root,
                requiredPath,
                resolvedPath,
              },
            });
          }
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        const args = node.arguments || [];
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          args.length === 1 &&
          args[0].type === 'Literal' &&
          typeof args[0].value === 'string'
        ) {
          const requiredPath = args[0].value;
          const resolvedPath = resolve(dir, requiredPath);
          if (
            // required a file not a package
            requiredPath.startsWith('.') &&
            // the resolved path for the required file is outside the package root
            !resolvedPath.startsWith(root)
          ) {
            context.report({
              node,
              messageId: 'noRelativeImportsAcrossPackages',
              data: {
                filename,
                root,
                requiredPath,
                resolvedPath,
              },
            });
          }
        }
      },
    };
  },
}) as any /* unnameable return type */;

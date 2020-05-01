/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CallExpression, Identifier} from '@babel/types';
import {NodePath} from '@babel/traverse';
import {
  tryReplaceFlipperRequire,
  tryReplaceGlobalReactUsage,
} from './replace-flipper-requires';

import {resolve} from 'path';

const sourceRootDir = resolve(__dirname, '..', '..');

function isExcludedPath(path: string) {
  // We shouldn't apply transformations for the plugins which are part of the repository
  // as they are bundled with Flipper app and all use the single "react" dependency.
  // But we should apply it for the plugins outside of Flipper folder, so they can be loaded
  // in dev mode and use "react" from Flipper bundle.
  return path.startsWith(sourceRootDir);
}
module.exports = () => ({
  visitor: {
    CallExpression(path: NodePath<CallExpression>, state: any) {
      if (isExcludedPath(state.file.opts.filename)) {
        return;
      }
      tryReplaceFlipperRequire(path);
    },
    Identifier(path: NodePath<Identifier>, state: any) {
      if (isExcludedPath(state.file.opts.filename)) {
        return;
      }
      tryReplaceGlobalReactUsage(path);
    },
  },
});

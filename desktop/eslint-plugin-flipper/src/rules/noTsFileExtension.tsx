/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import {createESLintRule} from '../utils/createEslintRule';

type Options = [];

export type MessageIds = 'noTsFileExtension';
export const RULE_NAME = 'no-ts-file-extension';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer "tsx" file extensions',
      recommended: 'error',
    },
    schema: [],
    messages: {
      noTsFileExtension: 'Use "tsx" file extension instead of "ts"',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename();
    const ext = path.extname(filename);
    const isTs = ext === '.ts' && !filename.endsWith('.d.ts');

    return {
      Program(node) {
        if (isTs) {
          context.report({
            node,
            messageId: 'noTsFileExtension',
          });
        }
      },
    };
  },
}) as any /* unnameable return type */;

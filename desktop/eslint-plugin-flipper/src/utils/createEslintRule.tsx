/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ESLintUtils} from '@typescript-eslint/experimental-utils';

export type RuleCreator = ReturnType<typeof ESLintUtils.RuleCreator>;

export const createESLintRule: RuleCreator = ESLintUtils.RuleCreator(() => ``);

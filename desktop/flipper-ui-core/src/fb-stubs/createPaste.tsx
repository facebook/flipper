/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {CreatePasteArgs, CreatePasteResult} from 'flipper-plugin';

export default async function createPaste(
  _args: string | CreatePasteArgs,
): Promise<CreatePasteResult | undefined> {
  throw new Error('Not implemented');
}

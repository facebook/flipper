/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {readCurrentRevision} from '../packageMetadata';

test('readCurrentRevision does not return something meaningful in dev mode', async () => {
  const ret = await readCurrentRevision();
  expect(ret).toBeUndefined();
});

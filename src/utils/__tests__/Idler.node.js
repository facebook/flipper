/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Idler} from '../Idler.tsx';

test('Idler should interrupt', async () => {
  const idler = new Idler();
  let i = 0;
  try {
    for (; i < 500; i++) {
      if (i == 100) {
        idler.cancel();
      }
      await idler.idle();
    }
    expect('error').toBe('thrown');
  } catch (e) {
    expect(i).toEqual(100);
  }
});

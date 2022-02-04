/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {timeout} from '../utils/timeout';

test('resolves', async () => {
  const p = Promise.resolve(3);

  await expect(timeout(100, p)).resolves.toBe(3);
});

test('rejects', async () => {
  const p = Promise.reject(new Error('oops'));

  await expect(timeout(100, p)).rejects.toMatchInlineSnapshot(`[Error: oops]`);
});

test('times out', async () => {
  let lateResolve: any;
  const p = new Promise((r) => {
    lateResolve = r;
  });

  await expect(timeout(100, p)).rejects.toMatchInlineSnapshot(
    `[Error: Timed out in 100 ms.]`,
  );
  lateResolve(); // avoid dangling promise after test
});

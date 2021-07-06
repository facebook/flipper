/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {IdlerImpl, TestIdler} from '../Idler';
import {sleep} from '../promiseTimeout';

test('Idler should interrupt', async () => {
  const idler = new IdlerImpl();
  let i = 0;
  try {
    for (; i < 500; i++) {
      if (i == 100) {
        expect(idler.shouldIdle()).toBe(false);
        idler.cancel();
        expect(idler.isCancelled()).toBe(true);
        expect(idler.shouldIdle()).toBe(true);
      }
      await idler.idle();
    }
    expect('error').toBe('thrown');
  } catch (e) {
    expect(i).toEqual(100);
  }
});

test('Idler should want to idle', async () => {
  const idler = new IdlerImpl(100);
  expect(idler.shouldIdle()).toBe(false);
  await sleep(10);
  expect(idler.shouldIdle()).toBe(false);
  await sleep(200);
  expect(idler.shouldIdle()).toBe(true);
  await idler.idle();
  expect(idler.shouldIdle()).toBe(false);
});

test('TestIdler can be controlled', async () => {
  const idler = new TestIdler();

  expect(idler.shouldIdle()).toBe(false);
  expect(idler.shouldIdle()).toBe(true);
  let resolved = false;
  idler.idle().then(() => {
    resolved = true;
  });
  expect(resolved).toBe(false);
  await idler.next();
  expect(resolved).toBe(true);

  expect(idler.shouldIdle()).toBe(false);
  expect(idler.shouldIdle()).toBe(true);
  idler.idle();
  await idler.next();

  expect(idler.isCancelled()).toBe(false);
  idler.cancel();
  expect(idler.isCancelled()).toBe(true);
  expect(idler.shouldIdle()).toBe(true);

  let threw = false;
  const p = idler.idle().catch((e: any) => {
    threw = true;
    expect(e).toMatchInlineSnapshot(
      `[CancelledPromiseError: Idler got killed]`,
    );
  });

  await p;
  expect(threw).toBe(true);
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const onBeforeExitFns: (() => void | Promise<void>)[] = [];
export const setProcessExitRoutine = (
  onBeforeExit: () => void | Promise<void>,
) => {
  onBeforeExitFns.push(onBeforeExit);
};

const resIsPromise = (res: void | Promise<void>): res is Promise<void> =>
  res instanceof Promise;
export const processExit = async (code: number) => {
  console.debug('processExit', code);

  setTimeout(() => {
    console.error('Process exit routines timed out');
    process.exit(code);
  }, 5000);

  // eslint-disable-next-line promise/catch-or-return
  await Promise.all(
    onBeforeExitFns.map(async (fn) => {
      try {
        const res = fn();
        if (resIsPromise(res)) {
          return res.catch((e) => {
            console.error('Process exit routine failed', e);
          });
        }
      } catch (e) {
        console.error('Process exit routine failed', e);
      }
    }),
  ).finally(() => {
    process.exit(code);
  });
};

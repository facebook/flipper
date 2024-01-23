/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {QueryClient, setLogger} from 'react-query';

export const queryClient = new QueryClient({});

setLogger({
  log: (...args) => {
    if (isEmptyObject(args[0])) return;

    console.log('[ui-debugger] ReactQuery ', ...args);
  },
  warn: (...args) => {
    if (isEmptyObject(args[0])) return;
    console.warn('[ui-debugger] ReactQuery ', ...args);
  },
  error: (...args) => {
    if (isEmptyObject(args[0])) return;

    const messageOrError = args[0];

    const message: string | undefined =
      typeof messageOrError === 'string'
        ? messageOrError
        : messageOrError?.message;

    if (message?.includes('Myles')) {
      //dont log myles errors as they are already logged (with sampling and can be noisy)
      return;
    }

    //downgrade react query network errors to warning so they dont get sent to log view
    console.warn('[ui-debugger] ReactQuery ', ...args);
  },
});

function isEmptyObject(obj: unknown): boolean {
  //We get this empty object being logged in production, not sure why
  return (
    obj != null && typeof obj === 'object' && Object.keys(obj).length === 0
  );
}

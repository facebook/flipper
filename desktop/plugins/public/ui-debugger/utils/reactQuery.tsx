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
    console.log('[ui-debugger] ReactQuery ', ...args);
  },
  warn: (...args) => {
    console.warn('[ui-debugger] ReactQuery ', ...args);
  },
  error: (...args) => {
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

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
    //downgrade react query network errors to warning so they dont get sent to scribe
    console.warn('[ui-debugger] ReactQuery ', ...args);
  },
});

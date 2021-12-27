/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const startGlobalErrorHandling = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('"error" event intercepted:', event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('"unhandledrejection" event intercepted:', event.reason);
    });
  }
};

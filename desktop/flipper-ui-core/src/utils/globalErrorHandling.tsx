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
    window.onerror = (event) => {
      console.error('"onerror" event intercepted:', event);
    };
    window.onunhandledrejection = (event) => {
      console.error('"unhandledrejection" event intercepted:', event.reason);
    };
  }
};

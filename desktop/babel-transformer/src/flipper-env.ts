/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * There are some env vars which affect transformations, so the Metro/Babel cache should be invalidated when at least one of them changed.
 * They are used in get-cache-key.ts for cache key generation.
 */
type FlipperEnvVars = {
  FLIPPER_FB?: string;
  FLIPPER_TEST_RUNNER?: string;
  FLIPPER_ELECTRON_VERSION?: string;
  NODE_ENV?: string;
};

const flipperEnv = new Proxy(
  {
    FLIPPER_FB: undefined,
    FLIPPER_TEST_RUNNER: undefined,
    FLIPPER_ELECTRON_VERSION: undefined,
    NODE_ENV: undefined,
  } as FlipperEnvVars,
  {
    get: function (obj, prop) {
      if (typeof prop === 'string') {
        return process.env[prop];
      } else {
        return (obj as any)[prop];
      }
    },
    set: function () {
      throw new Error('flipperEnv is read-only');
    },
  },
);

export default flipperEnv;

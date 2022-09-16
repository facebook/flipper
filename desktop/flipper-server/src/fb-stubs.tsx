/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Module from 'module';

Module.prototype.require = new Proxy(Module.prototype.require, {
  apply(target, thisArg, argumentsList) {
    const name = argumentsList[0];

    if (
      process.env.FLIPPER_FORCE_PUBLIC_BUILD !== 'true' &&
      typeof name === 'string' &&
      name.includes('fb-stubs')
    ) {
      const replacement = name.replace('/fb-stubs/', '/fb/');
      try {
        return Reflect.apply(target, thisArg, [
          replacement,
          argumentsList.slice(1),
        ]);
      } catch {
        return Reflect.apply(target, thisArg, argumentsList);
      }
    }

    return Reflect.apply(target, thisArg, argumentsList);
  },
});

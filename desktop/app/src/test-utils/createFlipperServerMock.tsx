/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, FlipperServerCommands} from 'flipper-common';

export function createFlipperServerMock(
  overrides?: Partial<FlipperServerCommands>,
): FlipperServer {
  return {
    on: jest.fn(),
    off: jest.fn(),
    exec: jest
      .fn()
      .mockImplementation(
        (cmd: keyof FlipperServerCommands, ...args: any[]) => {
          if (overrides?.[cmd]) {
            return (overrides[cmd] as any)(...args);
          }
          return Promise.reject(
            new Error(`FlipperServerMock exec not implemented: ${cmd}}`),
          );
        },
      ),
    close: jest.fn(),
  };
}

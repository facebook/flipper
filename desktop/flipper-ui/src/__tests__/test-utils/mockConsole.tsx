/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import baseMockConsole from 'jest-mock-console';

/**
 * Mockes the current console. Inspect results through e.g.
 * console.errorCalls etc.
 *
 * Or, alternatively, expect(mockedConsole.error).toBeCalledWith...
 *
 * Don't forgot to call .unmock when done!
 */
export function mockConsole() {
  const restoreConsole = baseMockConsole();
  // The mocked console methods, make sure they remain available after unmocking
  const {log, error, warn} = console as any;
  return {
    get logCalls(): any[][] {
      return log.mock.calls;
    },
    get errorCalls(): any[][] {
      return error.mock.calls;
    },
    get warnCalls(): any[][] {
      return warn.mock.calls;
    },
    get log(): jest.Mock<any, any> {
      return log as any;
    },
    get warn(): jest.Mock<any, any> {
      return warn as any;
    },
    get error(): jest.Mock<any, any> {
      return error as any;
    },
    unmock() {
      restoreConsole();
    },
  };
}

export type MockedConsole = ReturnType<typeof mockConsole>;

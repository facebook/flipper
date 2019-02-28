/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

declare module 'keytar' {
  declare module.exports: {
    getPassword: (service: string, account: string) => Promise<string | null>,
    setPassword: (
      service: string,
      account: string,
      password: string,
    ) => Promise<void>,
    deletePassword: (service: string, account: string) => Promise<boolean>,
    findPassword: (service: string) => Promise<string | null>,
    findCredentials: (
      service: string,
    ) => Promise<Array<{account: string, password: string}>>,
  };
}

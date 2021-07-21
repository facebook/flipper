/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare namespace jest {
  interface It {
    /**
     * This test will not be executed on Github / SandCastle,
     * since, for example, it relies on precise timer reliability
     */
    local: jest.It;
    /**
     * This test will only run on non-windows machines
     */
    unix: jest.It;
  }
}

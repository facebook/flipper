/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isAllowedHost, isLoopbackAddress} from '../localhostSecurity';

describe('localhostSecurity', () => {
  test.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
    'accepts loopback address %s',
    (address) => {
      expect(isLoopbackAddress(address)).toBe(true);
    },
  );

  test.each([undefined, '192.168.0.1', '10.0.0.1', '::ffff:192.168.0.1'])(
    'rejects non-loopback address %s',
    (address) => {
      expect(isLoopbackAddress(address)).toBe(false);
    },
  );

  test.each([
    'localhost',
    'localhost:52342',
    '127.0.0.1',
    '127.0.0.1:52342',
    '[::1]',
    '[::1]:52342',
  ])('accepts local Host header %s', (host) => {
    expect(isAllowedHost(host)).toBe(true);
  });

  test.each([
    undefined,
    '',
    'attacker.example',
    'localhost.attacker.example',
    '127.0.0.1.attacker.example',
    '[::1].attacker.example',
  ])('rejects non-local Host header %s', (host) => {
    expect(isAllowedHost(host)).toBe(false);
  });
});

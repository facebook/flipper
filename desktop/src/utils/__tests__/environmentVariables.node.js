/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {parseFlipperPorts} from '../environmentVariables.tsx';

test('Valid port overrides are parsed correctly', () => {
  const overrides = parseFlipperPorts('1111,2222');
  expect(overrides).toEqual({insecure: 1111, secure: 2222});
});

test('Malformed numbers are ignored', () => {
  const malformed1 = parseFlipperPorts('1111,22s22');
  expect(malformed1).toBe(undefined);

  const malformed2 = parseFlipperPorts('11a11,2222');
  expect(malformed2).toBe(undefined);
});

test('Wrong number of values is ignored', () => {
  const overrides = parseFlipperPorts('1111');
  expect(overrides).toBe(undefined);
});

test('Empty values are ignored', () => {
  const overrides = parseFlipperPorts('1111,');
  expect(overrides).toBe(undefined);
});

test('Negative values are ignored', () => {
  const overrides = parseFlipperPorts('-1111,2222');
  expect(overrides).toBe(undefined);
});

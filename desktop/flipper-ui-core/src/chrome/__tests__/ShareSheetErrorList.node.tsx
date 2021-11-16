/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {formatError} from '../ShareSheetErrorList';

test('normal error is formatted', () => {
  const e = new Error('something went wrong');
  expect(formatError(e)).toEqual('Error: something went wrong');
});

test('objects are formatted', () => {
  const e: any = {iam: 'not an error'};
  expect(formatError(e)).toEqual('{"iam":"not an error"}');
});

test('recursive data structures are not formatted', () => {
  const e: any = {b: null};
  e.b = e;
  expect(formatError(e)).toEqual('<unrepresentable error>');
});

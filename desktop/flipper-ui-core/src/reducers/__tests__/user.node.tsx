/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, login, logout} from '../user';

test('login', () => {
  const userData = {name: 'Jane Doe'};
  const res = reducer({}, login(userData));
  expect(res).toEqual(userData);
});

test('logout', () => {
  const res = reducer(
    {
      name: 'Jane Doe',
    },
    logout(),
  );
  expect(res).toEqual({});
});

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {default as reducer, login, logout} from '../user';

test('login', () => {
  const userData = {username: 'Jane Doe'};
  const res = reducer({}, login(userData));
  expect(res).toEqual(userData);
});

test('logout', () => {
  const res = reducer(
    {
      username: 'Jane Doe',
    },
    logout(),
  );
  expect(res).toEqual({});
});

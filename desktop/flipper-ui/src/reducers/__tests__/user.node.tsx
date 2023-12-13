/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, setUserProfile} from '../user';

test('login', () => {
  const userData = {name: 'Jane Doe'};
  const res = reducer({}, setUserProfile(userData));
  expect(res).toEqual(userData);
});

test('logout', () => {
  const res = reducer(
    {
      name: 'Jane Doe',
    },
    setUserProfile(undefined),
  );
  expect(res).toEqual({});
});

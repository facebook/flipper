/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getRequestAuthToken} from '../requestAuthentication';

describe('requestAuthentication', () => {
  test('reads the token from the flipper_auth cookie', () => {
    expect(
      getRequestAuthToken({cookie: 'other=value; flipper_auth=cookie-token'}),
    ).toBe('cookie-token');
  });

  test('prefers the cookie over x-access-token', () => {
    expect(
      getRequestAuthToken({
        cookie: 'flipper_auth=cookie-token',
        'x-access-token': 'header-token',
      }),
    ).toBe('cookie-token');
  });

  test('falls back to x-access-token', () => {
    expect(getRequestAuthToken({'x-access-token': 'header-token'})).toBe(
      'header-token',
    );
  });

  test('returns null without an authentication header', () => {
    expect(getRequestAuthToken({})).toBeNull();
  });
});

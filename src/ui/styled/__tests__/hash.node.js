/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import hash from '../hash.js';

test('hash', () => {
  expect(hash('f')).toBe('1xwd1rk');
  expect(hash('foobar')).toBe('slolri');
  expect(hash('foobar2')).toBe('34u6r4');
});

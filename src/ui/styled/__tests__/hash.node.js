/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import hash from '../hash.js';

test('hash', () => {
  expect(hash('f')).toBe('1xwd1rk');
  expect(hash('foobar')).toBe('slolri');
  expect(hash('foobar2')).toBe('34u6r4');
});

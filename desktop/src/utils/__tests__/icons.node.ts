/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {buildLocalIconPath, buildIconURL} from '../icons';
import * as path from 'path';

test('filled icons get correct local path', () => {
  const iconPath = buildLocalIconPath('star', 12, 2);
  expect(iconPath).toBe(path.join('icons', 'star-filled-12@2x.png'));
});

test('outline icons get correct local path', () => {
  const iconPath = buildLocalIconPath('star-outline', 12, 2);
  expect(iconPath).toBe(path.join('icons', 'star-outline-12@2x.png'));
});

test('filled icons get correct URL', () => {
  const iconUrl = buildIconURL('star', 12, 2);
  expect(iconUrl).toBe(
    'https://external.xx.fbcdn.net/assets/?name=star&variant=filled&size=12&set=facebook_icons&density=2x',
  );
});

test('outline icons get correct URL', () => {
  const iconUrl = buildIconURL('star-outline', 12, 2);
  expect(iconUrl).toBe(
    'https://external.xx.fbcdn.net/assets/?name=star&variant=outline&size=12&set=facebook_icons&density=2x',
  );
});

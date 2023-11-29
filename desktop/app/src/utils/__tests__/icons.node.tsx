/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {buildLocalIconPath, getLocalIconUrl} from '../icons';
// eslint-disable-next-line flipper/no-relative-imports-across-packages
import {getPublicIconUrl} from '../../../../flipper-ui-core/src/utils/icons';
import * as path from 'path';
import {getRenderHostInstance} from 'flipper-ui-core';
import fs from 'fs';

test('filled icons get correct local path', () => {
  const iconPath = buildLocalIconPath({
    name: 'star',
    variant: 'filled',
    size: 12,
  });
  expect(iconPath).toBe(path.join('icons', 'star-filled_d.png'));
});

test('outline icons get correct local path', () => {
  const iconPath = buildLocalIconPath({
    name: 'star',
    variant: 'outline',
    size: 12,
  });
  expect(iconPath).toBe(path.join('icons', 'star-outline_d.png'));
});

test('filled icons get correct URL', async () => {
  const icon = {
    name: 'star',
    variant: 'filled',
    size: 12,
  } as const;
  const iconUrl = getPublicIconUrl(icon);
  expect(iconUrl).toBe(
    'https://facebook.com/images/assets_DO_NOT_HARDCODE/facebook_icons/star_filled_12.png',
  );
  const staticPath = getRenderHostInstance().serverConfig.paths.staticPath;
  const localUrl = getLocalIconUrl(icon, iconUrl, staticPath, false);
  // since files don't exist at disk in de checkouts
  expect(localUrl).toBe(iconUrl);

  // ... let's mock a file
  const iconPath = path.join(staticPath, 'icons', 'star-filled_d.png');
  try {
    await fs.promises.writeFile(
      iconPath,
      'Generated for unit tests. Please remove',
    );
    // should now generate a absolute path
    expect(getLocalIconUrl(icon, iconUrl, staticPath, false)).toBe(iconPath);
  } finally {
    await fs.promises.unlink(iconPath);
  }
});

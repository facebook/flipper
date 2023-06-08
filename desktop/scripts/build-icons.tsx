/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import fetch from '@adobe/node-fetch-retry';
// eslint-disable-next-line node/no-extraneous-import
import type {Icon} from 'flipper-ui-core';

export type Icons = {
  [key: string]: Icon['size'][];
};

// Takes a string like 'star', or 'star-outline', and converts it to
// {trimmedName: 'star', variant: 'filled'} or {trimmedName: 'star', variant: 'outline'}
function getIconPartsFromName(icon: string): {
  trimmedName: string;
  variant: 'outline' | 'filled';
} {
  const isOutlineVersion = icon.endsWith('-outline');
  const trimmedName = isOutlineVersion ? icon.replace('-outline', '') : icon;
  const variant = isOutlineVersion ? 'outline' : 'filled';
  return {trimmedName: trimmedName, variant: variant};
}

export async function downloadIcons(buildFolder: string) {
  const icons: Icons = JSON.parse(
    await fs.promises.readFile(path.join(buildFolder, 'icons.json'), {
      encoding: 'utf8',
    }),
  );
  const iconURLs = Object.entries(icons).reduce<Icon[]>(
    (acc, [entryName, sizes]) => {
      const {trimmedName: name, variant} = getIconPartsFromName(entryName);
      acc.push(
        // get icons in @1x and @2x
        ...sizes.map((size) => ({name, variant, size, density: 1})),
        ...sizes.map((size) => ({name, variant, size, density: 2})),
      );
      return acc;
    },
    [],
  );

  await Promise.all(
    iconURLs.map(async (icon) => {
      const url = getPublicIconUrl(icon);
      const res = await fetch(url);
      if (res.status !== 200) {
        console.warn(
          // eslint-disable-next-line prettier/prettier
          `Could not download the icon ${icon} from ${url}: got status ${res.status}`,
        );
        return;
      }
      return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(
          path.join(buildFolder, buildLocalIconPath(icon)),
        );
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
      });
    }),
  );
}

// should match flipper-ui-core/src/utils/icons.tsx
export function getPublicIconUrl({name, variant, size, density}: Icon) {
  return `https://facebook.com/images/assets_DO_NOT_HARDCODE/facebook_icons/${name}_${variant}_${size}_primary-icon.png`;
}

// should match app/src/utils/icons.tsx
function buildLocalIconPath(icon: Icon) {
  return path.join(
    'icons',
    `${icon.name}-${icon.variant}-${icon.size}@${icon.density}x.png`,
  );
}

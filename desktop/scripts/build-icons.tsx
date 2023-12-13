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
import type {Icon} from 'flipper-ui/src/utils/icons';

const AVAILABLE_SIZES: Icon['size'][] = [8, 10, 12, 16, 18, 20, 24, 28, 32, 48];

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
  const icons: string[] = JSON.parse(
    await fs.promises.readFile(path.join(buildFolder, 'icons.json'), {
      encoding: 'utf8',
    }),
  );
  const iconURLs: Pick<Icon, 'name' | 'variant'>[] = icons.map((rawName) => {
    const {trimmedName: name, variant} = getIconPartsFromName(rawName);
    return {name, variant};
  });

  // Download first largest instance of each icon
  await Promise.all(
    iconURLs.map(async (icon) => {
      const sizesToTry = [...AVAILABLE_SIZES];

      while (sizesToTry.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const size = sizesToTry.pop()!;

        const url = getPublicIconUrl({...(icon as Icon), size});
        const res = await fetch(url);
        if (res.status !== 200) {
          // console.log(
          //   // eslint-disable-next-line prettier/prettier
          //   `Could not download the icon ${
          //     icon.name
          //   } at size ${size} from ${url}: got status ${
          //     res.status
          //   }. Will fallback to one of the sizes: ${sizesToTry.join(' or ')}`,
          // );
          // not available at this size, pick the next
          continue;
        }
        return new Promise((resolve, reject) => {
          const fileStream = fs.createWriteStream(
            path.join(buildFolder, buildLocalIconPath(icon)),
          );
          res.body.pipe(fileStream);
          res.body.on('error', reject);
          fileStream.on('finish', resolve);
        });
      }
      console.error(
        `Could not download the icon ${JSON.stringify(
          icon,
        )} from ${getPublicIconUrl({
          ...icon,
          size: AVAILABLE_SIZES[AVAILABLE_SIZES.length - 1],
        } as Icon)}, didn't find any matching size`,
      );
    }),
  );
}

// should match flipper-ui/src/utils/icons.tsx
export function getPublicIconUrl({name, variant, size}: Icon) {
  return `https://facebook.com/images/assets_DO_NOT_HARDCODE/facebook_icons/${name}_${variant}_${size}.png`;
}

// should match app/src/utils/icons.tsx
function buildLocalIconPath(icon: Pick<Icon, 'name' | 'variant'>) {
  return path.join('icons', `${icon.name}-${icon.variant}_d.png`);
}

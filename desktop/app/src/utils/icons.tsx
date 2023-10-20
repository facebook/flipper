/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// We should get rid of sync use entirely but until then the
// methods are marked as such.
/* eslint-disable node/no-sync */

import fs from 'fs';
import path from 'path';
import type {Icon} from 'flipper-ui-core';

export type Icons = {
  [key: string]: Icon['size'][];
};

let _icons: Icons | undefined;

function getIconsSync(staticPath: string): Icons {
  return (
    _icons ??
    (_icons = JSON.parse(
      fs.readFileSync(path.join(staticPath, 'icons.json'), {encoding: 'utf8'}),
    ))
  );
}

export function buildLocalIconPath(icon: Icon) {
  return path.join('icons', `${icon.name}-${icon.variant}_d.png`);
}

export function getLocalIconUrl(
  icon: Icon,
  url: string,
  basePath: string,
  registerIcon: boolean,
): string {
  // resolve icon locally if possible
  const iconPath = path.join(basePath, buildLocalIconPath(icon));
  if (fs.existsSync(iconPath)) {
    return iconPath;
  }
  if (registerIcon) {
    tryRegisterIcon(icon, url, basePath);
  }

  return url; // fall back to http URL
}

function tryRegisterIcon(icon: Icon, url: string, staticPath: string) {
  const entryName = icon.name + (icon.variant === 'outline' ? '-outline' : '');
  const {size} = icon;
  const icons = getIconsSync(staticPath);
  if (!icons[entryName]?.includes(size)) {
    const existing = icons[entryName] || (icons[entryName] = []);
    if (!existing.includes(size)) {
      // Check if that icon actually exists!
      fetch(url)
        .then((res) => {
          if (res.status !== 200) {
            throw new Error(
              // eslint-disable-next-line prettier/prettier
              `Trying to use icon '${entryName}' with size ${size}, however the icon doesn't seem to exists at ${url}: ${res.status}`,
            );
          }
          if (!existing.includes(size)) {
            // the icon exists
            existing.push(size);
            existing.sort();
            fs.writeFileSync(
              path.join(staticPath, 'icons.json'),
              JSON.stringify(icons, null, 2),
              'utf8',
            );
            console.warn(
              `Added uncached icon "${entryName}: [${size}]" to /static/icons.json.`,
            );
          } else {
          }
        })
        .catch((e) => console.error(e));
    }
  }
}

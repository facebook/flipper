/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import path from 'path';
import {remote} from 'electron';
import {getStaticPath} from './pathUtils';

const AVAILABLE_SIZES = [8, 10, 12, 16, 18, 20, 24, 32];
const DENSITIES = [1, 1.5, 2, 3, 4];

function getIconsPath() {
  return path.resolve(getStaticPath(), 'icons.json');
}

export type Icons = {
  [key: string]: number[];
};

let _icons: Icons | undefined;

export function getIcons(): Icons {
  return (
    _icons! ??
    (_icons = JSON.parse(fs.readFileSync(getIconsPath(), {encoding: 'utf8'})))
  );
}

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

function getIconFileName(
  icon: {trimmedName: string; variant: 'outline' | 'filled'},
  size: number,
  density: number,
) {
  return `${icon.trimmedName}-${icon.variant}-${size}@${density}x.png`;
}

export function buildLocalIconPath(
  name: string,
  size: number,
  density: number,
) {
  const icon = getIconPartsFromName(name);
  return path.join('icons', getIconFileName(icon, size, density));
}

export function buildLocalIconURL(name: string, size: number, density: number) {
  const icon = getIconPartsFromName(name);
  return `icons/${getIconFileName(icon, size, density)}`;
}

export function buildIconURL(name: string, size: number, density: number) {
  const icon = getIconPartsFromName(name);
  // eslint-disable-next-line prettier/prettier
  const url = `https://external.xx.fbcdn.net/assets/?name=${
    icon.trimmedName
    }&variant=${
    icon.variant
    }&size=${size}&set=facebook_icons&density=${density}x`;
  if (
    typeof window !== 'undefined' &&
    (!getIcons()[name] || !getIcons()[name].includes(size))
  ) {
    // From utils/isProduction
    const isProduction = !/node_modules[\\/]electron[\\/]/.test(
      process.execPath || remote.process.execPath,
    );

    if (!isProduction) {
      const existing = getIcons()[name] || (getIcons()[name] = []);
      if (!existing.includes(size)) {
        // Check if that icon actually exists!
        fetch(url)
          .then((res) => {
            if (res.status === 200 && !existing.includes(size)) {
              // the icon exists
              existing.push(size);
              existing.sort();
              fs.writeFileSync(
                getIconsPath(),
                JSON.stringify(getIcons(), null, 2),
                'utf8',
              );
              console.warn(
                `Added uncached icon "${name}: [${size}]" to /static/icons.json. Restart Flipper to apply the change.`,
              );
            } else {
              throw new Error(
                // eslint-disable-next-line prettier/prettier
                `Trying to use icon '${name}' with size ${size} and density ${density}, however the icon doesn't seem to exists at ${url}: ${
                res.status
                }`,
              );
            }
          })
          .catch((e) => console.error(e));
      }
    } else {
      console.warn(
        `Using uncached icon: "${name}: [${size}]". Add it to /static/icons.json to preload it.`,
      );
    }
  }
  return url;
}

export function getIconURL(name: string, size: number, density: number) {
  if (name.indexOf('/') > -1) {
    return name;
  }

  let requestedSize = size;
  if (!AVAILABLE_SIZES.includes(size)) {
    // find the next largest size
    const possibleSize = AVAILABLE_SIZES.find((size) => {
      return size > requestedSize;
    });

    // set to largest size if the real size is larger than what we have
    if (possibleSize == null) {
      requestedSize = Math.max(...AVAILABLE_SIZES);
    } else {
      requestedSize = possibleSize;
    }
  }

  if (!DENSITIES.includes(density)) {
    // find the next largest size
    const possibleDensity = DENSITIES.find((scale) => {
      return scale > density;
    });

    // set to largest size if the real size is larger than what we have
    if (possibleDensity == null) {
      density = Math.max(...DENSITIES);
    } else {
      density = possibleDensity;
    }
  }

  // resolve icon locally if possible
  if (
    remote &&
    fs.existsSync(
      path.join(
        remote.app.getAppPath(),
        buildLocalIconPath(name, size, density),
      ),
    )
  ) {
    return buildLocalIconURL(name, size, density);
  }
  return buildIconURL(name, requestedSize, density);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getRenderHostInstance} from 'flipper-frontend-core';
import {IconSize} from '../ui/components/Glyph';

const AVAILABLE_SIZES: IconSize[] = [8, 10, 12, 16, 18, 20, 24, 28, 32, 48];
const DENSITIES = [1, 1.5, 2, 3, 4];

export type Icon = {
  name: string;
  variant: 'outline' | 'filled';
  size: IconSize;
  density: number;
};

function normalizeIcon(icon: Icon): Icon {
  let {size, density} = icon;
  let requestedSize = size as number;
  if (!AVAILABLE_SIZES.includes(size as any)) {
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

  return {
    ...icon,
    size: requestedSize as IconSize,
    density,
  };
}

export function getPublicIconUrl({name, variant, size}: Icon) {
  return `https://facebook.com/images/assets_DO_NOT_HARDCODE/facebook_icons/${name}_${variant}_${size}.png`;
}

export function getIconURL(icon: Icon) {
  if (icon.name.indexOf('/') > -1) {
    return icon.name;
  }

  icon = normalizeIcon(icon);
  const baseUrl = getPublicIconUrl(icon);

  return getRenderHostInstance().getLocalIconUrl?.(icon, baseUrl) ?? baseUrl;
}

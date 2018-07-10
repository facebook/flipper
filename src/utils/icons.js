/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// list of icons that are prefetched in the service worker when launching the app
export const precachedIcons: Array<string> = [
  {
    name: 'arrow-right',
    size: 12,
  },
  {
    name: 'caution-octagon',
  },
  {
    name: 'caution-triangle',
  },
  {
    name: 'info-circle',
  },
  {
    name: 'magic-wand',
    size: 20,
  },
  {
    name: 'magnifying-glass',
  },
  {
    name: 'minus-circle',
    size: 12,
  },
  {
    name: 'mobile',
    size: 12,
  },
  {
    name: 'bug',
    size: 12,
  },
  {
    name: 'posts',
    size: 20,
  },
  {
    name: 'rocket',
    size: 20,
  },
  {
    name: 'tools',
    size: 20,
  },
  {
    name: 'triangle-down',
    size: 12,
  },
  {
    name: 'triangle-right',
    size: 12,
  },
  {
    name: 'chevron-right',
    size: 8,
  },
  {
    name: 'chevron-down',
    size: 8,
  },
].map(icon => getIconUrl(icon.name, icon.size || undefined));

export function getIconUrl(
  name: string,
  size?: number = 16,
  variant?: 'filled' | 'outline' = 'filled',
): string {
  if (name.indexOf('/') > -1) {
    return name;
  }

  const AVAILABLE_SIZES = [8, 10, 12, 16, 18, 20, 24, 32];
  const SCALE = [1, 1.5, 2, 3, 4];

  let requestedSize: number = size;
  if (!AVAILABLE_SIZES.includes(size)) {
    // find the next largest size
    const possibleSize: ?number = AVAILABLE_SIZES.find(size => {
      return size > requestedSize;
    });

    // set to largest size if the real size is larger than what we have
    if (possibleSize == null) {
      requestedSize = Math.max(...AVAILABLE_SIZES);
    } else {
      requestedSize = possibleSize;
    }
  }

  let requestedScale: number = window.devicePixelRatio;
  if (!SCALE.includes(requestedScale)) {
    // find the next largest size
    const possibleScale: ?number = SCALE.find(scale => {
      return scale > requestedScale;
    });

    // set to largest size if the real size is larger than what we have
    if (possibleScale == null) {
      requestedScale = Math.max(...SCALE);
    } else {
      requestedScale = possibleScale;
    }
  }

  return `https://external.xx.fbcdn.net/assets/?name=${name}&variant=filled&size=${requestedSize}&set=facebook_icons&density=${requestedScale}x${
    variant == 'outline' ? '&variant=outline' : ''
  }`;
}

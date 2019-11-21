/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* This file needs to be plain JS to be imported by scripts/build-release.js */
/* eslint-disable import/no-commonjs */

const AVAILABLE_SIZES = [8, 10, 12, 16, 18, 20, 24, 32];
const DENSITIES = [1, 1.5, 2, 3, 4];
const fs = require('fs');
const path = require('path');
const {remote} = require('electron');

const ICONS = {
  'app-dailies': [12],
  'arrow-right': [12],
  'bell-null-outline': [12, 24],
  'bell-null': [12],
  'caution-octagon': [16],
  'caution-triangle': [16, 24],
  'chevron-down-outline': [10],
  'chevron-down': [8, 12],
  'chevron-up': [8, 12],
  'chevron-right': [8, 12, 16],
  'cross-circle': [16, 24],
  'dots-3-circle-outline': [16],
  'flash-default': [12],
  'info-circle': [16, 24],
  'magic-wand': [20],
  'magnifying-glass': [16, 20],
  'minus-circle': [12],
  'mobile-engagement': [16],
  'question-circle-outline': [16],
  'star-outline': [12, 16, 24],
  'triangle-down': [12],
  'triangle-right': [12],
  accessibility: [16],
  apps: [12],
  bird: [12],
  borders: [16],
  box: [12],
  bug: [12],
  camcorder: [12],
  camera: [12],
  caution: [16],
  cross: [16],
  checkmark: [16],
  desktop: [12],
  directions: [12],
  download: [16],
  internet: [12],
  mobile: [12, 16, 32],
  posts: [20],
  power: [16],
  profile: [12],
  'refresh-left': [16],
  rocket: [20],
  settings: [12],
  share: [16],
  star: [12, 16, 24],
  'star-slash': [16],
  'life-event-major': [16],
  target: [12, 16],
  tools: [12, 20],
  'washing-machine': [12],
};

// Takes a string like 'star', or 'star-outline', and converts it to
// {trimmedName: 'star', variant: 'filled'} or {trimmedName: 'star', variant: 'outline'}
function getIconPartsFromName(icon) {
  const isOutlineVersion = icon.endsWith('-outline');
  const trimmedName = isOutlineVersion ? icon.replace('-outline', '') : icon;
  const variant = isOutlineVersion ? 'outline' : 'filled';
  return {trimmedName: trimmedName, variant: variant};
}

// $FlowFixMe not using flow in this file
function buildLocalIconPath(name, size, density) {
  const icon = getIconPartsFromName(name);
  return path.join(
    'icons',
    `${icon.trimmedName}-${icon.variant}-${size}@${density}x.png`,
  );
}

// $FlowFixMe not using flow in this file
function buildIconURL(name, size, density) {
  const icon = getIconPartsFromName(name);
  // eslint-disable-next-line prettier/prettier
  const url = `https://external.xx.fbcdn.net/assets/?name=${
    icon.trimmedName
  }&variant=${
    icon.variant
  }&size=${size}&set=facebook_icons&density=${density}x`;
  if (
    typeof window !== 'undefined' &&
    (!ICONS[name] || !ICONS[name].includes(size))
  ) {
    console.warn(
      `Using uncached icon: "${name}: [${size}]" Add it to icons.js to preload it.`,
    );
  }
  return url;
}

module.exports = {
  ICONS: ICONS,

  buildLocalIconPath: buildLocalIconPath,
  buildIconURL: buildIconURL,

  // $FlowFixMe: not using flow in this file
  getIconURL(name, size, density) {
    if (name.indexOf('/') > -1) {
      return name;
    }

    let requestedSize = size;
    if (!AVAILABLE_SIZES.includes(size)) {
      // find the next largest size
      const possibleSize = AVAILABLE_SIZES.find(size => {
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
      const possibleDensity = DENSITIES.find(scale => {
        return scale > density;
      });

      // set to largest size if the real size is larger than what we have
      if (possibleDensity == null) {
        density = Math.max(...DENSITIES);
      } else {
        density = possibleDensity;
      }
    }

    const localPath = buildLocalIconPath(name, size, density);
    // resolve icon locally if possible
    if (
      remote &&
      fs.existsSync(path.join(remote.app.getAppPath(), localPath))
    ) {
      return localPath;
    }
    return buildIconURL(name, requestedSize, density);
  },
};

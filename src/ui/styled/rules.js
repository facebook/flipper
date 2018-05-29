/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {CSSPropertySet, CSSPropertyValue} from './types.js';

const dashify = require('dashify');

export type NormalisedRules = {
  [namespace: string]: BaseRules,
};

export type BaseRules = {
  [key: string]: CSSPropertyValue<string | number>,
};

export type PlainRules = {
  [key: string]: string,
};

export type NormalisedKeyframeRules = {
  [key: string]: PlainRules,
};

export type KeyframeRules = {
  [key: string]: CSSPropertySet,
};

export type RawRules = {
  ...CSSPropertySet,
  [key: string]: CSSPropertySet,
};

const unitlessNumberProperties = new Set([
  'animation-iteration-count',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'column-count',
  'flex',
  'flex-grow',
  'flex-positive',
  'flex-shrink',
  'flex-order',
  'grid-row',
  'grid-column',
  'font-weight',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
  'fill-opacity',
  'flood-opacity',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
]);

// put top level styles into an '&' object
function expandRules(rules: RawRules): NormalisedRules {
  const expandedRules = {};
  const rootRules = {};

  for (const key in rules) {
    const val = rules[key];

    if (typeof val === 'object') {
      expandedRules[key] = val;
    } else {
      rootRules[key] = val;
    }
  }

  if (Object.keys(rootRules).length) {
    expandedRules['&'] = rootRules;
  }

  return expandedRules;
}

function shouldAppendPixel(key: string, val: mixed): boolean {
  return (
    typeof val === 'number' && !unitlessNumberProperties.has(key) && !isNaN(val)
  );
}

export function normaliseRules(rules: RawRules): NormalisedRules {
  const expandedRules = expandRules(rules);

  const builtRules = {};

  for (const key in expandedRules) {
    const rules = expandedRules[key];
    const myRules = {};

    for (const key in rules) {
      const val = rules[key];

      let dashedKey = dashify(key);
      if (/[A-Z]/.test(key[0])) {
        dashedKey = `-${dashedKey}`;
      }

      myRules[dashedKey] = val;
    }

    if (Object.keys(myRules).length) {
      builtRules[key] = myRules;
    }
  }

  return builtRules;
}

export function buildKeyframeRules(
  rules: KeyframeRules,
): NormalisedKeyframeRules {
  const spec = {};

  for (const selector in rules) {
    const newRules = {};

    const rules2 = rules[selector];
    if (!rules2 || typeof rules2 !== 'object') {
      throw new Error('Keyframe spec must only have objects');
    }

    for (const key in rules2) {
      let val = rules2[key];

      if (shouldAppendPixel(key, val)) {
        val += 'px';
      } else if (typeof val === 'number') {
        val = String(val);
      }

      if (typeof val !== 'string') {
        throw new Error('Keyframe objects must only have strings values');
      }

      newRules[key] = val;
    }

    spec[selector] = newRules;
  }

  return spec;
}

export function buildRules(
  rules: BaseRules,
  props: NormalisedRules,
  context: Object,
): PlainRules {
  const style = {};
  for (const key in rules) {
    let val = rules[key];
    if (typeof val === 'function') {
      val = val(props, context);
    }
    if (val != null && shouldAppendPixel(key, val)) {
      val += 'px';
    }
    if (val != null) {
      style[key] = String(val);
    }
  }
  return style;
}

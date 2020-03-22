/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {IconSize} from '../ui/components/Glyph';

declare function getIconURL(
  name: string,
  size?: IconSize,
  density?: number,
): string;

declare const ICONS: {
  [key: string]: Array<IconSize>;
};

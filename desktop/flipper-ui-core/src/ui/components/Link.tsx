/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getFlipperLib} from 'flipper-plugin';
import {Typography} from 'antd';

const AntOriginalLink = Typography.Link;

// used by patch for Typography.Link in AntD
// @ts-ignore
global.flipperOpenLink = function openLinkExternal(url: string) {
  getFlipperLib().openLink(url);
};

export default AntOriginalLink;

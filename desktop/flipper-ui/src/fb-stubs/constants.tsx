/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceOS} from 'flipper-plugin';

export default Object.freeze({
  IS_PUBLIC_BUILD: true,

  // Enables the flipper data to be exported through shareabale link
  ENABLE_SHAREABLE_LINK: false,

  FEEDBACK_GROUP_LINK: 'https://github.com/facebook/flipper/issues',

  // Workplace Group ID's
  DEFAULT_SUPPORT_GROUP: {
    name: 'Default Support Group',
    workplaceGroupID: 0,
    requiredPlugins: ['Inspector'],
    defaultPlugins: ['DeviceLogs'],
    supportedOS: ['Android'] as Array<DeviceOS>,
    deeplinkSuffix: 'default',
    papercuts: '',
  },

  SUPPORT_GROUPS: [],
});

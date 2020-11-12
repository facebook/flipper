/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {OS} from '../devices/BaseDevice';

export default Object.freeze({
  GRAPH_APP_ID: '',
  GRAPH_CLIENT_TOKEN: '',
  GRAPH_ACCESS_TOKEN: '',

  // this provides elevated access to scribe. we really shouldn't be exposing this.
  // need to investigate how to abstract the scribe logging so it's safe.
  GRAPH_SECRET: '',
  GRAPH_SECRET_ACCESS_TOKEN: '',

  // Provides access to Insights Validation endpoint on interngraph
  INSIGHT_INTERN_APP_ID: '',
  INSIGHT_INTERN_APP_TOKEN: '',

  // Enables the flipper data to be exported through shareabale link
  ENABLE_SHAREABLE_LINK: false,

  IS_PUBLIC_BUILD: true,

  FEEDBACK_GROUP_LINK: 'https://github.com/facebook/flipper/issues',

  // Workplace Group ID's
  DEFAULT_SUPPORT_GROUP: {
    name: 'Default Support Group',
    workplaceGroupID: 0,
    requiredPlugins: ['Inspector'],
    defaultPlugins: ['DeviceLogs'],
    supportedOS: ['Android'] as Array<OS>,
    deeplinkSuffix: 'default',
    papercuts: '',
  },

  SUPPORT_GROUPS: [],
});

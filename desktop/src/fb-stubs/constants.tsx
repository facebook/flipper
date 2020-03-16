/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

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
  LITHO_SUPPORT_GROUP_ID: 0,
  GRAPHQL_ANDROID_SUPPORT_GROUP_ID: 0,
  GRAPHQL_IOS_SUPPORT_GROUP_ID: 0,
});

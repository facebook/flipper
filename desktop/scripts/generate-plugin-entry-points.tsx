/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable flipper/no-console-error-without-context */

import {prepareDefaultPlugins, prepareHeadlessPlugins} from './build-utils';

Promise.all([prepareDefaultPlugins(), prepareHeadlessPlugins()]).catch(
  (err) => {
    console.error(err);
    process.exit(1);
  },
);

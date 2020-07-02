/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {resolvePluginDir} from './workspaces';

resolvePluginDir(process.argv[2])
  .then((dir) => {
    console.log(dir);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable flipper/no-console-error-without-context */

import fs from 'fs-extra';
import path from 'path';
import {rootDir} from './paths';

// TODO: Remove me in 2023 when everyone who is building flipper from source have legacy plugin entry points removed by this script

(async () => {
  await Promise.all(
    [
      path.resolve(rootDir, 'app/src/defaultPlugins'),
      path.resolve(rootDir, 'flipper-server/src/defaultPlugins'),
      path.resolve(rootDir, 'flipper-ui/src/defaultPlugins'),
    ].map((dir) =>
      fs.rm(dir, {
        recursive: true,
        force: true,
      }),
    ),
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

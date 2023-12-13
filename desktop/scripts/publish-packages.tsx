/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable flipper/no-console-error-without-context */

import {publishPackages} from './workspaces';
import yargs from 'yargs';

// eslint-disable-next-line node/no-sync
const argv = yargs
  .usage('$0 [args]')
  .options({
    newVersion: {key: 'new-version', alias: 'v', type: 'string'},
    proxy: {key: 'proxy', alias: 'p', type: 'string'},
    dryRun: {key: 'dry-run', alias: 'd', type: 'boolean'},
  })
  .help()
  .parseSync();

publishPackages(argv)
  .then(() => process.exit(0))
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {bumpVersions} from './workspaces';
import yargs from 'yargs';

const argv = yargs
  .usage('$0 [args]')
  .options({
    newVersion: {key: 'new-version', alias: 'v', type: 'string'},
    dryRun: {key: 'dry-run', alias: 'd', type: 'boolean'},
  })
  .help().argv;

bumpVersions(argv)
  .then((version) => {
    console.log(`Versions bumped to ${version}`);
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

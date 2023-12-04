/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable flipper/no-console-error-without-context */

import {computePackageChecksum} from 'flipper-pkg-lib';
import yargs from 'yargs';

// eslint-disable-next-line node/no-sync
const argv = yargs
  .usage('yarn compute-package-checksum [args]')
  .version(false)
  .options({
    dir: {
      description: 'Package root directory',
      type: 'string',
      demandOption: true,
      alias: 'd',
    },
    out: {
      description:
        'File relative to the package root directory where the computed checksum should be saved, e.g. "lib/checksum.txt"',
      type: 'string',
      alias: 'o',
    },
  })
  .help()
  .parseSync(process.argv.slice(1));

computePackageChecksum(argv.dir, argv.out)
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {computePackageChecksum} from 'flipper-pkg-lib';
import yargs from 'yargs';

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
  .strict()
  .parse(process.argv.slice(1));

computePackageChecksum(argv.dir, argv.out)
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// TODO: currently flipper-server is only suitable for development,
// needs to be come independently runnable, prebundled, distributed, etc!
// in future require conditionally
import {startWebServerDev} from './startWebServerDev';
import chalk from 'chalk';

startWebServerDev().catch((e) => {
  console.error(chalk.red('Server error: '), e);
  process.exit(1);
});

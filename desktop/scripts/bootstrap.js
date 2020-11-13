/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const linkYarnLock = require('./link-lock');

linkYarnLock().catch((err) => {
  console.error(err);
  process.exit(1);
});

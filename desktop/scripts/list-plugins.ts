/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getWorkspaces} from './workspaces';

getWorkspaces()
  .then((workspaces) => {
    workspaces.packages
      .filter((x) => x.isPlugin)
      .forEach((x) => console.log(x.dir));
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

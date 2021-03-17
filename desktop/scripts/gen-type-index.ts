/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {rootDir} from './paths';
import path from 'path';
import fs from 'fs-extra';

async function genTypeIndex() {
  const typesDir = path.join(rootDir, 'types');
  const filePaths = (await fs.readdir(typesDir))
    .filter(
      (filePath) => filePath.endsWith('.d.ts') && filePath !== 'index.d.ts',
    )
    .sort();
  await fs.writeFile(
    path.join(typesDir, 'index.d.ts'),
    // @lint-ignore-every LICENSELINT
    `/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

${filePaths
  .map((filePath) => `/// <reference path="${filePath}" />`)
  .join('\n')}
`,
  );
}

genTypeIndex()
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });

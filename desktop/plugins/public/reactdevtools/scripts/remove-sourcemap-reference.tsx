/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable no-restricted-imports */

/*
 * This script attempts to get rid of a sourcemap reference in react-devtools-frontend
 * that is causing a rather annoying non-fetal error at Flipper startup.
 *
 * It will gracefully fail as Flipper will still work without it, just show the error again.
 */

import fs from 'fs-extra';
import path from 'path';

const SOURCEMAP_REFERENCE =
  '//# sourceMappingURL=importFile.worker.worker.js.map';

async function main() {
  const frontendPath = path.resolve(
    __dirname,
    '../../node_modules/react-devtools-inline/dist/frontend.js',
  );
  console.log(`Looking up ${frontendPath} for patching ...`);
  // Check if path exists
  if (!(await fs.pathExists(frontendPath))) {
    console.warn('react-devtools-inline frontend not found, skipping patching');
    return 0;
  }

  const content = await fs.readFile(frontendPath, 'utf-8');
  if (!content.includes(SOURCEMAP_REFERENCE)) {
    console.log('react-devtools-inline appears to already be patched.');
    return 0;
  }

  await fs.writeFile(frontendPath, content.replaceAll(SOURCEMAP_REFERENCE, ''));

  console.log('react-devtools-inline patched successfully.');
  return 0;
}

(async () => {
  process.exit(await main());
})();

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import fs from 'fs-extra';

// Metro erroneously adds source map comments to the bottom of the file
// which break checksums on CI environments where paths change and are generally
// undesired. We manually strip the comment here and write the file back.
export default async function stripSourceMapComment(out: string) {
  const lines = (await fs.readFile(out, 'utf-8')).split(os.EOL);
  const lastLine = lines[lines.length - 1];
  if (lastLine.startsWith('//# sourceMappingURL=')) {
    console.log(`Updating ${out} to remove sourceMapURL= comment.`);
    await fs.writeFile(out, lines.slice(0, lines.length - 1).join(os.EOL));
  }
}

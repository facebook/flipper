/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import packlist from 'npm-packlist';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';

export default async function computePackageChecksum(
  dir: string,
): Promise<string> {
  const hash = crypto.createHash('sha1');
  hash.setEncoding('hex');
  const files = (await packlist({path: dir})).sort();
  for (const file of files) {
    // add hash of relative file path
    hash.write(process.platform === 'win32' ? file.replace(/\\/g, '/') : file);

    const filePath = path.resolve(dir, file);

    if (file === 'package.json') {
      // add hash of package.json with version set to "0.0.0" to avoid changing hash when only version changed
      const packageJson = await fs.readJson(filePath);
      if (packageJson.version) {
        packageJson.version = '0.0.0';
      }
      hash.write(JSON.stringify(packageJson));
    } else {
      // add hash of file content
      const stream = fs.createReadStream(filePath);
      try {
        stream.pipe(hash, {end: false});
        await new Promise((resolve, reject) => {
          stream.once('end', resolve);
          stream.once('error', reject);
        });
      } finally {
        stream.close();
      }
    }
  }
  hash.end();
  return hash.read();
}

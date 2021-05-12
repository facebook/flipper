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
  checksumFilePath?: string,
): Promise<string> {
  const fullChecksumFilePath = checksumFilePath
    ? path.resolve(dir, checksumFilePath)
    : undefined;
  if (fullChecksumFilePath) {
    // This block is an optimisation to not recompute checksum if nothing changed.
    // tsbuildinfo file is changed every time when typescript compiler re-compiles anything,
    // so we could compare its modification date with checksum modification date to
    // decide whether we need to re-compute checksum or we can just use already computed one.
    const tsBuildInfoPath = path.join(dir, 'tsconfig.tsbuildinfo');
    try {
      const [tsBuildInfoStat, checksumStat] = await Promise.all([
        fs.stat(tsBuildInfoPath),
        fs.stat(fullChecksumFilePath),
      ]);
      if (checksumStat.mtime > tsBuildInfoStat.mtime) {
        return (await fs.readFile(fullChecksumFilePath)).toString();
      }
    } catch {}
  }
  const hash = crypto.createHash('sha1');
  hash.setEncoding('hex');
  const files = (await packlist({path: dir})).sort();
  for (const file of files) {
    const filePath = path.resolve(dir, file);

    if (filePath === fullChecksumFilePath) {
      // If there is already existing checksum file, we need to ignore it as it is not a part of package content.
      continue;
    }

    // add hash of relative normalized file path
    hash.write(process.platform === 'win32' ? file.replace(/\\/g, '/') : file);

    if (file === 'package.json') {
      // add hash of package.json with version set to "0.0.0" to avoid changing hash when only version changed
      const packageJson = await fs.readJson(filePath);
      if (packageJson.version) {
        packageJson.version = '0.0.0';
      }
      if (packageJson.engines && packageJson.engines.flipper) {
        packageJson.engines.flipper = '0.0.0';
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
  const checksum = hash.read();
  if (fullChecksumFilePath) {
    await fs.writeFile(fullChecksumFilePath, checksum);
  }
  return checksum;
}

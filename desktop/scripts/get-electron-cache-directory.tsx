/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import yargs from 'yargs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as url from 'url';

const argv = yargs
  .usage('$0 [args]')
  .options({
    electronVersion: {
      key: 'electronVersion',
      alias: 'v',
      type: 'string',
      demandOption: true,
    },
  })
  .help().argv;

// https://github.com/electron/get/blob/1671db2120142d7850260b098db72b0ef5ee988c/src/Cache.ts#L23
const getCacheDirectory = (downloadUrl: string): string => {
  const parsedDownloadUrl = url.parse(downloadUrl);
  const {search, hash, pathname, ...rest} = parsedDownloadUrl;
  const strippedUrl = url.format({
    ...rest,
    pathname: path.dirname(pathname || 'electron'),
  });

  return crypto.createHash('sha256').update(strippedUrl).digest('hex');
};

const getUrl = ({electronVersion}: {electronVersion: string}) => {
  // It is going to be stripped to https://github.com/electron/electron/releases/download/v${electronVersion}, so it is going to be the same for all platforms
  const url = `https://github.com/electron/electron/releases/download/v${electronVersion}/electron-v${electronVersion}-linux-x64.zip`;
  return getCacheDirectory(url);
};

const folderName = getUrl(argv);
console.log(folderName);

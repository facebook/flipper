/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {readFile} from 'fs';
import path from 'path';
import {decodeBody} from '../utils';
import {ResponseInfo} from '../types';
import {promisify} from 'util';
import {readFileSync} from 'fs';

async function createMockResponse(input: string): Promise<ResponseInfo> {
  const inputData = await promisify(readFile)(
    path.join(__dirname, 'fixtures', input),
    'ascii',
  );
  const gzip = input.includes('gzip'); // if gzip in filename, assume it is a gzipped body
  const testResponse: ResponseInfo = {
    id: '0',
    timestamp: 0,
    status: 200,
    reason: 'dunno',
    headers: gzip
      ? [
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
        ]
      : [],
    data: inputData.replace(/\s+?/g, '').trim(), // remove whitespace caused by copy past of the base64 data,
    isMock: false,
    insights: undefined,
    totalChunks: 1,
    index: 0,
  };
  return testResponse;
}

describe('network data encoding', () => {
  const donatingExpected = readFileSync(
    path.join(__dirname, 'fixtures', 'donating.md'),
    'utf-8',
  ).trim();
  const tinyLogoExpected = readFileSync(
    path.join(__dirname, 'fixtures', 'tiny_logo.png'),
  );
  const tinyLogoBase64Expected = readFileSync(
    path.join(__dirname, 'fixtures', 'tiny_logo.base64.txt'),
    'utf-8',
  );

  test('donating.md.utf8.ios.txt', async () => {
    const response = await createMockResponse('donating.md.utf8.ios.txt');
    expect(decodeBody(response).trim()).toEqual(donatingExpected);
  });

  test('donating.md.utf8.gzip.ios.txt', async () => {
    const response = await createMockResponse('donating.md.utf8.gzip.ios.txt');
    expect(decodeBody(response).trim()).toEqual(donatingExpected);
  });

  test('donating.md.utf8.android.txt', async () => {
    const response = await createMockResponse('donating.md.utf8.android.txt');
    expect(decodeBody(response).trim()).toEqual(donatingExpected);
  });

  test('donating.md.utf8.gzip.android.txt', async () => {
    const response = await createMockResponse(
      'donating.md.utf8.gzip.android.txt',
    );
    expect(decodeBody(response).trim()).toEqual(donatingExpected);
  });

  test('tiny_logo.android.txt', async () => {
    const response = await createMockResponse('tiny_logo.android.txt');
    expect(response.data).toEqual(tinyLogoExpected.toString('base64'));
  });

  test('tiny_logo.android.txt - encoded', async () => {
    const response = await createMockResponse('tiny_logo.android.txt');
    // this compares to the correct base64 encoded src tag of the img in Flipper UI
    expect(response.data).toEqual(tinyLogoBase64Expected.trim());
  });

  test('tiny_logo.ios.txt', async () => {
    const response = await createMockResponse('tiny_logo.ios.txt');
    expect(response.data).toEqual(tinyLogoExpected.toString('base64'));
  });

  test('tiny_logo.ios.txt - encoded', async () => {
    const response = await createMockResponse('tiny_logo.ios.txt');
    // this compares to the correct base64 encoded src tag of the img in Flipper UI
    expect(response.data).toEqual(tinyLogoBase64Expected.trim());
  });
});

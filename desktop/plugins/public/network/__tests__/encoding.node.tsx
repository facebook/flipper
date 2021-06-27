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
import {decodeBody, isTextual} from '../utils';
import {ResponseInfo} from '../types';
import {promisify} from 'util';
import {readFileSync} from 'fs';
import {TestUtils} from 'flipper-plugin';
import * as NetworkPlugin from '../index';

async function createMockResponse(
  input: string,
  contentType: string,
): Promise<ResponseInfo> {
  const inputData = await promisify(readFile)(
    path.join(__dirname, 'fixtures', input),
    'ascii',
  );
  const gzip = input.includes('gzip'); // if gzip in filename, assume it is a gzipped body
  const contentTypeHeader = {key: 'Content-Type', value: contentType};
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
          contentTypeHeader,
        ]
      : [contentTypeHeader],
    data: inputData.replace(/\s+?/g, '').trim(), // remove whitespace caused by copy past of the base64 data,
    isMock: false,
    insights: undefined,
    totalChunks: 1,
    index: 0,
  };
  return testResponse;
}

function bodyAsString(response: ResponseInfo) {
  const res = decodeBody(response.headers, response.data);
  expect(typeof res).toBe('string');
  return (res as string).trim();
}

function bodyAsBuffer(response: ResponseInfo) {
  const res = decodeBody(response.headers, response.data);
  expect(res).toBeInstanceOf(Uint8Array);
  return Buffer.from(res as Uint8Array);
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
    const response = await createMockResponse(
      'donating.md.utf8.ios.txt',
      'text/plain',
    );
    expect(bodyAsString(response)).toEqual(donatingExpected);
  });

  test('donating.md.utf8.gzip.ios.txt', async () => {
    const response = await createMockResponse(
      'donating.md.utf8.gzip.ios.txt',
      'text/plain',
    );
    expect(bodyAsString(response)).toEqual(donatingExpected);
  });

  test('donating.md.utf8.android.txt', async () => {
    const response = await createMockResponse(
      'donating.md.utf8.android.txt',
      'text/plain',
    );
    expect(bodyAsString(response)).toEqual(donatingExpected);
  });

  test('donating.md.utf8.gzip.android.txt', async () => {
    const response = await createMockResponse(
      'donating.md.utf8.gzip.android.txt',
      'text/plain',
    );
    expect(bodyAsString(response)).toEqual(donatingExpected);
  });

  test('tiny_logo.android.txt', async () => {
    const response = await createMockResponse(
      'tiny_logo.android.txt',
      'image/png',
    );
    expect(response.data).toEqual(tinyLogoExpected.toString('base64'));
    expect(bodyAsBuffer(response)).toEqual(tinyLogoExpected);
  });

  test('tiny_logo.android.txt - encoded', async () => {
    const response = await createMockResponse(
      'tiny_logo.android.txt',
      'image/png',
    );
    // this compares to the correct base64 encoded src tag of the img in Flipper UI
    expect(response.data).toEqual(tinyLogoBase64Expected.trim());
    expect(bodyAsBuffer(response)).toEqual(tinyLogoExpected);
  });

  test('tiny_logo.ios.txt', async () => {
    const response = await createMockResponse('tiny_logo.ios.txt', 'image/png');
    expect(response.data).toEqual(tinyLogoExpected.toString('base64'));
    expect(bodyAsBuffer(response)).toEqual(tinyLogoExpected);
  });

  test('tiny_logo.ios.txt - encoded', async () => {
    const response = await createMockResponse('tiny_logo.ios.txt', 'image/png');
    // this compares to the correct base64 encoded src tag of the img in Flipper UI
    expect(response.data).toEqual(tinyLogoBase64Expected.trim());
    expect(bodyAsBuffer(response)).toEqual(tinyLogoExpected);
  });
});

test('detects utf8 strings in binary arrays', async () => {
  const binaryBuffer = readFileSync(
    path.join(__dirname, 'fixtures', 'tiny_logo.png'),
  );
  const textBuffer = readFileSync(
    path.join(__dirname, 'fixtures', 'donating.md'),
  );
  const textBuffer2 = readFileSync(__filename);
  expect(isTextual(undefined, binaryBuffer)).toBe(false);
  expect(isTextual(undefined, textBuffer)).toBe(true);
  expect(isTextual(undefined, textBuffer2)).toBe(true);
});

test('binary data gets serialized correctly', async () => {
  const tinyLogoExpected = readFileSync(
    path.join(__dirname, 'fixtures', 'tiny_logo.png'),
  );
  const tinyLogoData = readFileSync(
    path.join(__dirname, 'fixtures', 'tiny_logo.base64.txt'),
    'utf-8',
  );
  const donatingExpected = readFileSync(
    path.join(__dirname, 'fixtures', 'donating.md'),
    'utf-8',
  );
  const donatingData = readFileSync(
    path.join(__dirname, 'fixtures', 'donating.md.utf8.gzip.ios.txt'),
    'utf-8',
  );
  const {instance, sendEvent, exportStateAsync} =
    TestUtils.startPlugin(NetworkPlugin);
  sendEvent('newRequest', {
    id: '0',
    timestamp: 0,
    data: donatingData,
    headers: [
      {
        key: 'Content-Type',
        value: 'text/plain',
      },
    ],
    method: 'post',
    url: 'http://www.fbflipper.com',
  });
  const response = await createMockResponse(
    'tiny_logo.android.txt',
    'image/png',
  );
  sendEvent('newResponse', response);

  expect(instance.requests.getById('0')).toMatchObject({
    requestHeaders: [
      {
        key: 'Content-Type',
        value: 'text/plain',
      },
    ],
    requestData: donatingExpected,
    responseHeaders: [
      {
        key: 'Content-Type',
        value: 'image/png',
      },
    ],
    responseData: new Uint8Array(tinyLogoExpected),
  });

  const snapshot = await exportStateAsync();
  expect(snapshot).toMatchObject({
    isMockResponseSupported: true,
    selectedId: undefined,
    requests2: [
      {
        domain: 'www.fbflipper.com/',
        duration: 0,
        id: '0',
        insights: undefined,
        method: 'post',
        reason: 'dunno',
        requestHeaders: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
        requestData: donatingExpected, // not encoded
        responseData: [tinyLogoData.trim()], // wrapped represents base64
        responseHeaders: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
        ],
        responseIsMock: false,
        responseLength: 24838,
        status: 200,
        url: 'http://www.fbflipper.com',
      },
    ],
  });

  const {instance: instance2} = TestUtils.startPlugin(NetworkPlugin, {
    initialState: snapshot,
  });
  expect(instance2.requests.getById('0')).toMatchObject({
    domain: 'www.fbflipper.com/',
    duration: 0,
    id: '0',
    insights: undefined,
    method: 'post',
    reason: 'dunno',
    requestHeaders: [
      {
        key: 'Content-Type',
        value: 'text/plain',
      },
    ],
    requestData: donatingExpected,
    responseData: new Uint8Array(tinyLogoExpected),
    responseHeaders: [
      {
        key: 'Content-Type',
        value: 'image/png',
      },
    ],
    responseIsMock: false,
    responseLength: 24838,
    status: 200,
    url: 'http://www.fbflipper.com',
  });
});

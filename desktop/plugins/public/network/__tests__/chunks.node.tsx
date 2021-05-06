/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {combineBase64Chunks} from '../chunks';
import {TestUtils} from 'flipper-plugin';
import * as NetworkPlugin from '../index';
import {assembleChunksIfResponseIsComplete} from '../chunks';
import path from 'path';
import {Base64} from 'js-base64';
import * as fs from 'fs';
import {promisify} from 'util';

const readFile = promisify(fs.readFile);

test('Test assembling base64 chunks', () => {
  const message = 'wassup john?';
  const chunks = message.match(/.{1,2}/g)?.map(btoa);

  if (chunks === undefined) {
    throw new Error('invalid chunks');
  }

  const output = combineBase64Chunks(chunks);
  expect(Base64.decode(output)).toBe('wassup john?');
});

test('Reducer correctly adds initial chunk', () => {
  const {instance, sendEvent} = TestUtils.startPlugin(NetworkPlugin);
  expect(instance.partialResponses.get()).toEqual({});

  sendEvent('partialResponse', {
    id: '1',
    timestamp: 123,
    status: 200,
    data: 'hello',
    reason: 'nothing',
    headers: [],
    isMock: false,
    insights: null,
    index: 0,
    totalChunks: 2,
  });

  expect(instance.partialResponses.get()['1']).toMatchInlineSnapshot(`
    Object {
      "followupChunks": Object {},
      "initialResponse": Object {
        "data": "hello",
        "headers": Array [],
        "id": "1",
        "index": 0,
        "insights": null,
        "isMock": false,
        "reason": "nothing",
        "status": 200,
        "timestamp": 123,
        "totalChunks": 2,
      },
    }
  `);
});

test('Reducer correctly adds followup chunk', () => {
  const {instance, sendEvent} = TestUtils.startPlugin(NetworkPlugin);
  expect(instance.partialResponses.get()).toEqual({});

  sendEvent('partialResponse', {
    id: '1',
    totalChunks: 2,
    index: 1,
    data: 'hello',
  });
  expect(instance.partialResponses.get()['1']).toMatchInlineSnapshot(`
    Object {
      "followupChunks": Object {
        "1": "hello",
      },
    }
  `);
});

test('Reducer correctly combines initial response and followup chunk', () => {
  const {instance, sendEvent} = TestUtils.startPlugin(NetworkPlugin);
  sendEvent('newRequest', {
    data: 'x',
    headers: [{key: 'y', value: 'z'}],
    id: '1',
    method: 'GET',
    timestamp: 0,
    url: 'http://test.com',
  });
  sendEvent('partialResponse', {
    data: 'aGVs',
    headers: [],
    id: '1',
    insights: null,
    isMock: false,
    reason: 'nothing',
    status: 200,
    timestamp: 123,
    index: 0,
    totalChunks: 2,
  });
  expect(instance.partialResponses.get()).toMatchInlineSnapshot(`
    Object {
      "1": Object {
        "followupChunks": Object {},
        "initialResponse": Object {
          "data": "aGVs",
          "headers": Array [],
          "id": "1",
          "index": 0,
          "insights": null,
          "isMock": false,
          "reason": "nothing",
          "status": 200,
          "timestamp": 123,
          "totalChunks": 2,
        },
      },
    }
  `);
  expect(instance.requests.records()[0]).toMatchObject({
    requestData: 'x',
    requestHeaders: [{key: 'y', value: 'z'}],
    id: '1',
    method: 'GET',
    url: 'http://test.com',
    domain: 'test.com/',
  });
  sendEvent('partialResponse', {
    id: '1',
    totalChunks: 2,
    index: 1,
    data: 'bG8=',
  });

  expect(instance.partialResponses.get()).toEqual({});
  expect(instance.requests.records()[0]).toMatchObject({
    domain: 'test.com/',
    duration: 123,
    id: '1',
    insights: undefined,
    method: 'GET',
    reason: 'nothing',
    requestData: 'x',
    requestHeaders: [
      {
        key: 'y',
        value: 'z',
      },
    ],
    responseData: 'aGVsbG8=',
    responseHeaders: [],
    responseIsMock: false,
    responseLength: 5,
    status: 200,
    url: 'http://test.com',
  });
});

async function readJsonFixture(filename: string) {
  return JSON.parse(
    await readFile(path.join(__dirname, 'fixtures', filename), 'utf-8'),
  );
}

test('handle small binary payloads correctly', async () => {
  const input = await readJsonFixture('partial_failing_example.json');
  expect(() => {
    // this used to throw
    assembleChunksIfResponseIsComplete(input);
  }).not.toThrow();
});

test('handle non binary payloads correcty', async () => {
  const input = await readJsonFixture('partial_utf8_before.json');
  const expected = await readJsonFixture('partial_utf8_after.json');
  const response = assembleChunksIfResponseIsComplete(input);
  expect(response).toEqual(expected);
});

test('handle binary payloads correcty', async () => {
  const input = await readJsonFixture('partial_binary_before.json');
  const expected = await readJsonFixture('partial_binary_after.json');
  const response = assembleChunksIfResponseIsComplete(input);
  expect(response).toEqual(expected);
});

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {combineBase64Chunks} from '../chunks';
import {TestUtils, createState} from 'flipper-plugin';
import * as NetworkPlugin from '../index';
import {assembleChunksIfResponseIsComplete} from '../chunks';
import path from 'path';
import {PartialResponses, Response} from '../types';
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
  instance.partialResponses.set({
    '1': {
      followupChunks: {},
      initialResponse: {
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
      },
    },
  });
  expect(instance.responses.get()).toEqual({});
  sendEvent('partialResponse', {
    id: '1',
    totalChunks: 2,
    index: 1,
    data: 'bG8=',
  });

  expect(instance.partialResponses.get()).toEqual({});
  expect(instance.responses.get()['1']).toMatchInlineSnapshot(`
    Object {
      "data": "aGVsbG8=",
      "headers": Array [],
      "id": "1",
      "index": 0,
      "insights": null,
      "isMock": false,
      "reason": "nothing",
      "status": 200,
      "timestamp": 123,
      "totalChunks": 2,
    }
  `);
});

async function readJsonFixture(filename: string) {
  return JSON.parse(
    await readFile(path.join(__dirname, 'fixtures', filename), 'utf-8'),
  );
}

test('handle small binary payloads correctly', async () => {
  const input = await readJsonFixture('partial_failing_example.json');
  const partials = createState<PartialResponses>({
    test: input,
  });
  const responses = createState<Record<string, Response>>({});
  expect(() => {
    // this used to throw
    assembleChunksIfResponseIsComplete(partials, responses, 'test');
  }).not.toThrow();
});

test('handle non binary payloads correcty', async () => {
  const input = await readJsonFixture('partial_utf8_before.json');
  const partials = createState<PartialResponses>({
    test: input,
  });
  const responses = createState<Record<string, Response>>({});
  expect(() => {
    assembleChunksIfResponseIsComplete(partials, responses, 'test');
  }).not.toThrow();
  const expected = await readJsonFixture('partial_utf8_after.json');
  expect(responses.get()['test']).toEqual(expected);
});

test('handle binary payloads correcty', async () => {
  const input = await readJsonFixture('partial_binary_before.json');
  const partials = createState<PartialResponses>({
    test: input,
  });
  const responses = createState<Record<string, Response>>({});
  expect(() => {
    assembleChunksIfResponseIsComplete(partials, responses, 'test');
  }).not.toThrow();
  const expected = await readJsonFixture('partial_binary_after.json');
  expect(responses.get()['test']).toEqual(expected);
});

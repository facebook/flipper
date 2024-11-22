/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createDataSource} from 'flipper-plugin';
import {RequestDataDB} from '../RequestDataDB';
import {createRequestFromRequestInfo} from '../index';

import {decodeBody} from '../utils';

import {Request} from '../types';
import {Base64} from 'js-base64';

// IndexedDB polyfill
global.structuredClone = (val) => (val ? JSON.parse(JSON.stringify(val)) : val);
require('fake-indexeddb/auto');

const firstRequest = {
  id: '17',
  timestamp: 1234567890,
  method: 'GET',
  url: 'https://fbflipper.com/',
  headers: [{key: 'Content-Type', value: 'text/plain'}],
  data: undefined,
};

const secondRequest = {
  id: '17',
  timestamp: 1234567890,
  method: 'GET', // same as before
  url: 'https://fallback.fbflipper.com/', // changed from before
  headers: [{key: 'Content-Type', value: 'text/plain'}],
  data: Base64.encode('hello world'), // new field (not stored in DataSource)
};

test('DataSource handles updates', () => {
  const requests = createDataSource<Request, 'id'>([], {
    key: 'id',
    indices: [['method'], ['status']],
  });
  const customColumns: Parameters<typeof createRequestFromRequestInfo>[1] = [];

  requests.upsert(createRequestFromRequestInfo(firstRequest, customColumns));
  requests.upsert(createRequestFromRequestInfo(secondRequest, customColumns));

  const result = requests.getById('17');
  expect(result?.method).toEqual('GET');
  expect(result?.url).toEqual('https://fallback.fbflipper.com/');
});

test('RequestDataDB handles updates', async () => {
  const db = new RequestDataDB();

  db.storeRequestData(
    firstRequest.id,
    decodeBody(firstRequest.headers, firstRequest.data),
  );
  db.storeRequestData(
    secondRequest.id,
    decodeBody(secondRequest.headers, secondRequest.data),
  );

  const result = await db.getRequestData('17');
  expect(result).toEqual('hello world');
});

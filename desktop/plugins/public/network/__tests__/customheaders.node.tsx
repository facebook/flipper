/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TestUtils} from 'flipper-plugin';
import * as NetworkPlugin from '../index';

test('Can handle custom headers', async () => {
  const {
    instance,
    sendEvent,
    act,
    renderer,
    exportState,
  } = TestUtils.renderPlugin(NetworkPlugin);

  act(() => {
    sendEvent('newRequest', {
      id: '1',
      timestamp: 123,
      data: 'hello',
      headers: [
        {
          key: 'test-header',
          value: 'fluffie',
        },
      ],
      method: 'post',
      url: 'http://www.fbflipper.com',
    });
  });

  // record visible
  expect(await renderer.findByText('www.fbflipper.com/')).not.toBeNull();
  // header not found
  expect(renderer.queryByText('fluffie')).toBeNull();

  // add column
  act(() => {
    instance.addCustomColumn({
      type: 'request',
      header: 'test-header',
    });
  });

  // applied to backlog, so header found
  expect(await renderer.findByText('fluffie')).not.toBeNull();

  // add response column
  act(() => {
    instance.addCustomColumn({
      type: 'response',
      header: 'second-test-header',
    });
  });

  // newly arriving data should respect custom columns
  sendEvent('newResponse', {
    id: '1',
    headers: [
      {
        key: 'second-test-header',
        value: 'dolphins',
      },
    ],
    timestamp: 124,
    data: '',
    status: 200,
    reason: '',
    isMock: false,
    insights: undefined,
  });

  expect(await renderer.findByText('dolphins')).not.toBeNull();

  // verify internal storage
  expect(instance.columns.get().slice(-2)).toMatchInlineSnapshot(`
    Array [
      Object {
        "key": "request_header_test-header",
        "title": "test-header (request)",
        "width": 200,
      },
      Object {
        "key": "response_header_second-test-header",
        "title": "second-test-header (response)",
        "width": 200,
      },
    ]
  `);
  expect(instance.requests.records()).toMatchObject([
    {
      domain: 'www.fbflipper.com/',
      duration: 1,
      id: '1',
      insights: undefined,
      method: 'post',
      reason: '',
      requestHeaders: [
        {
          key: 'test-header',
          value: 'fluffie',
        },
      ],
      'request_header_test-header': 'fluffie',
      responseData: undefined,
      responseHeaders: [
        {
          key: 'second-test-header',
          value: 'dolphins',
        },
      ],
      responseIsMock: false,
      responseLength: 0,
      'response_header_second-test-header': 'dolphins',
      status: 200,
      url: 'http://www.fbflipper.com',
    },
  ]);

  renderer.unmount();

  // after import, columns should be visible and restored
  {
    const snapshot = exportState();
    // Note: snapshot is set in the previous test
    const {instance: instance2, renderer: renderer2} = TestUtils.renderPlugin(
      NetworkPlugin,
      {
        initialState: snapshot,
      },
    );

    // record visible
    expect(await renderer2.findByText('www.fbflipper.com/')).not.toBeNull();
    expect(await renderer2.findByText('fluffie')).not.toBeNull();
    expect(await renderer2.findByText('dolphins')).not.toBeNull();

    // verify internal storage
    expect(instance2.columns.get().slice(-2)).toMatchInlineSnapshot(`
      Array [
        Object {
          "key": "request_header_test-header",
          "title": "test-header (request)",
          "width": 200,
        },
        Object {
          "key": "response_header_second-test-header",
          "title": "second-test-header (response)",
          "width": 200,
        },
      ]
    `);
  }
});

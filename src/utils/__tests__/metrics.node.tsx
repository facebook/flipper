/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.mock('../../fb-stubs/Logger');
try {
  jest.mock('../../fb/Logger');
} catch {
  // Allowed to fail when fb modules are not present.
}

import {reportPlatformFailures, reportPluginFailures} from '../metrics';
import {getInstance} from '../../fb/Logger';
import {CancelledPromiseError} from '../errors';
import {mocked} from 'ts-jest/utils';

const logger = mocked(getInstance());

test('reportPlatformFailures logs failures correctly', async () => {
  await reportPlatformFailures(
    Promise.reject(new Error('Broken Feature')),
    'test-event',
  ).catch(() => {
    // This is expected to throw
  });

  expect(logger.track.mock.calls).toMatchInlineSnapshot(`
                Array [
                  Array [
                    "success-rate",
                    "test-event",
                    Object {
                      "error": "Broken Feature",
                      "supportedOperation": 1,
                      "value": 0,
                    },
                  ],
                ]
        `);
});

test('reportPlatformFailures logs cancelled operations correctly', async () => {
  await reportPlatformFailures(
    Promise.reject(new CancelledPromiseError('Operation cancelled')),
    'test-event',
  ).catch(() => {
    // This is expected to throw
  });

  expect(logger.track.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "operation-cancelled",
            "test-event",
          ],
        ]
    `);
});

test('reportPlatformFailures logs success correctly', async () => {
  await reportPlatformFailures(Promise.resolve('woohoo!'), 'test-event');

  expect(logger.track.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                "success-rate",
                "test-event",
                Object {
                  "value": 1,
                },
              ],
            ]
      `);
});

test('reportPluginFailures logs failures correctly', async () => {
  await reportPluginFailures(
    Promise.reject(new Error('Broken Feature')),
    'test-event',
    'test-plugin',
  ).catch(() => {
    // This is expected to throw
  });

  expect(logger.track.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "success-rate",
        "test-event",
        Object {
          "error": "Broken Feature",
          "supportedOperation": 1,
          "value": 0,
        },
        "test-plugin",
      ],
    ]
  `);
});

test('reportPluginFailures logs cancelled operations correctly', async () => {
  await reportPluginFailures(
    Promise.reject(new CancelledPromiseError('Operation cancelled')),
    'test-event',
    'test-plugin',
  ).catch(() => {
    // This is expected to throw
  });

  expect(logger.track.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "operation-cancelled",
        "test-event",
        undefined,
        "test-plugin",
      ],
    ]
  `);
});

test('reportPluginFailures logs success correctly', async () => {
  await reportPluginFailures(
    Promise.resolve('woohoo!'),
    'test-event',
    'test-plugin',
  );

  expect(logger.track.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "success-rate",
        "test-event",
        Object {
          "value": 1,
        },
        "test-plugin",
      ],
    ]
  `);
});

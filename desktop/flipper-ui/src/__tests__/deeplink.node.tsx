/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.useFakeTimers();

import React from 'react';
import {renderMockFlipperWithPlugin} from './test-utils/createMockFlipperWithPlugin';
import {
  _SandyPluginDefinition,
  PluginClient,
  TestUtils,
  usePlugin,
  createState,
  useValue,
} from 'flipper-plugin';
import {handleDeeplink} from '../deeplink';
import {Logger} from 'flipper-common';

test('Triggering a deeplink will work', async () => {
  const linksSeen: any[] = [];

  const plugin = (client: PluginClient) => {
    const linkState = createState('');
    client.onDeepLink((link) => {
      linksSeen.push(link);
      linkState.set(String(link));
    });
    return {
      linkState,
    };
  };

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin,
      Component() {
        const instance = usePlugin(plugin);
        const linkState = useValue(instance.linkState);
        return <h1>{linkState || 'world'}</h1>;
      },
    },
  );
  const {renderer, client, store, logger} =
    await renderMockFlipperWithPlugin(definition);

  expect(linksSeen).toEqual([]);

  await handleDeeplink(
    store,
    logger,
    `flipper://${client.query.app}/${definition.id}/universe`,
  );

  jest.runAllTimers();
  expect(linksSeen).toEqual(['universe']);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-1x2cmzz-SandySplitContainer e148ues30"
        >
          <div />
          <div
            class="css-1knrt0j-SandySplitContainer e148ues30"
          >
            <div
              class="css-1woty6b-Container"
            >
              <h1>
                universe
              </h1>
            </div>
            <div
              class="css-724x97-View-FlexBox-FlexRow"
              id="detailsSidebar"
            />
          </div>
        </div>
      </div>
    </body>
  `);
});

test('Will throw error on invalid deeplinks', async () => {
  const logger: Logger = {
    track: jest.fn(),
  } as any;

  expect(() =>
    handleDeeplink(undefined as any, logger, `flipper://test`),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unknown deeplink"`);

  expect(logger.track).toHaveBeenCalledTimes(2);
  expect(logger.track).toHaveBeenLastCalledWith(
    'usage',
    'deeplink',
    {
      query: 'flipper://test',
      state: 'ERROR',
      errorMessage: 'Unknown deeplink',
    },
    undefined,
  );
});

test('Will throw error on invalid protocol', async () => {
  const logger: Logger = {
    track: jest.fn(),
  } as any;

  expect(() =>
    handleDeeplink(undefined as any, logger, `notflipper://test`),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unknown deeplink"`);

  expect(logger.track).toHaveBeenCalledTimes(2);
  expect(logger.track).toHaveBeenLastCalledWith(
    'usage',
    'deeplink',
    {
      query: 'notflipper://test',
      state: 'ERROR',
      errorMessage: 'Unknown deeplink',
    },
    undefined,
  );
});

test('Will track deeplinks', async () => {
  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin: () => {},
      Component() {
        return <h1>{'world'}</h1>;
      },
    },
  );
  const {store, logger} = await renderMockFlipperWithPlugin(definition);
  logger.track = jest.fn();

  await handleDeeplink(
    store,
    logger,
    'flipper://open-plugin?plugin-id=TestPlugin&client=TestApp&payload=universe',
  );

  expect(logger.track).toHaveBeenCalledWith(
    'usage',
    'deeplink',
    {
      query:
        'flipper://open-plugin?plugin-id=TestPlugin&client=TestApp&payload=universe',
      state: 'INIT',
    },
    undefined,
  );
});

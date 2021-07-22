/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.useFakeTimers();

import React from 'react';
import {renderMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {
  _SandyPluginDefinition,
  PluginClient,
  TestUtils,
  usePlugin,
  createState,
  useValue,
} from 'flipper-plugin';
import {parseOpenPluginParams} from '../handleOpenPluginDeeplink';
import {handleDeeplink} from '../../deeplink';

test('open-plugin deeplink parsing', () => {
  const testpayload = 'http://www.google/?test=c o%20o+l';
  const testLink =
    'flipper://open-plugin?plugin-id=graphql&client=facebook&devices=android,ios&chrome=1&payload=' +
    encodeURIComponent(testpayload);
  const res = parseOpenPluginParams(testLink);
  expect(res).toEqual({
    pluginId: 'graphql',
    client: 'facebook',
    devices: ['android', 'ios'],
    payload: 'http://www.google/?test=c o o+l',
  });
});

test('open-plugin deeplink parsing - 2', () => {
  const testLink = 'flipper://open-plugin?plugin-id=graphql';
  const res = parseOpenPluginParams(testLink);
  expect(res).toEqual({
    pluginId: 'graphql',
    client: undefined,
    devices: [],
    payload: undefined,
  });
});

test('open-plugin deeplink parsing - 3', () => {
  expect(() =>
    parseOpenPluginParams('flipper://open-plugin?'),
  ).toThrowErrorMatchingInlineSnapshot(`"Missing plugin-id param"`);
});

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
  const {renderer, client, store} = await renderMockFlipperWithPlugin(
    definition,
  );

  expect(linksSeen).toEqual([]);

  await handleDeeplink(
    store,
    `flipper://open-plugin?plugin-id=${definition.id}&client=${client.query.app}&payload=universe`,
  );

  jest.runAllTimers();
  expect(linksSeen).toEqual(['universe']);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-1x2cmzz-SandySplitContainer e1hsqii10"
        >
          <div />
          <div
            class="css-1knrt0j-SandySplitContainer e1hsqii10"
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

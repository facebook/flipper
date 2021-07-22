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
import {renderMockFlipperWithPlugin} from '../test-utils/createMockFlipperWithPlugin';
import {
  _SandyPluginDefinition,
  PluginClient,
  TestUtils,
  usePlugin,
  createState,
  useValue,
} from 'flipper-plugin';
import {handleDeeplink} from '../deeplink';

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
    `flipper://${client.query.app}/${definition.id}/universe`,
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

test('Will throw error on invalid deeplinks', async () => {
  // flipper:///support-form/?form=litho
  expect(() =>
    handleDeeplink(undefined as any, `flipper://test`),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unknown deeplink"`);
});

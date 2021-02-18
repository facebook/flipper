/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import produce from 'immer';
import {FlipperPlugin} from '../plugin';
import {renderMockFlipperWithPlugin} from '../test-utils/createMockFlipperWithPlugin';
import {
  _SandyPluginDefinition,
  PluginClient,
  TestUtils,
  usePlugin,
  createState,
  DevicePluginClient,
  DeviceLogEntry,
  useValue,
} from 'flipper-plugin';
import {selectPlugin} from '../reducers/connections';
import {updateSettings} from '../reducers/settings';
import {starPlugin} from '../reducers/pluginManager';

interface PersistedState {
  count: 1;
}

class TestPlugin extends FlipperPlugin<any, any, any> {
  static id = 'TestPlugin';

  static defaultPersistedState = {
    count: 0,
  };

  static persistedStateReducer(
    persistedState: PersistedState,
    method: string,
    payload: {delta?: number},
  ) {
    return produce(persistedState, (draft) => {
      if (method === 'inc') {
        draft.count += payload?.delta || 1;
      }
    });
  }

  render() {
    return (
      <h1>
        Hello:{' '}
        <span data-testid="counter">{this.props.persistedState.count}</span>
      </h1>
    );
  }
}

test('Plugin container can render plugin and receive updates', async () => {
  const {renderer, sendMessage, act} = await renderMockFlipperWithPlugin(
    TestPlugin,
  );
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <h1>
            Hello:
             
            <span
              data-testid="counter"
            >
              0
            </span>
          </h1>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  act(() => {
    sendMessage('inc', {delta: 2});
  });

  expect((await renderer.findByTestId('counter')).textContent).toBe('2');
});

test('PluginContainer can render Sandy plugins', async () => {
  let renders = 0;

  function MySandyPlugin() {
    renders++;
    const sandyApi = usePlugin(plugin);
    const count = useValue(sandyApi.count);
    expect(Object.keys(sandyApi)).toEqual([
      'connectedStub',
      'disconnectedStub',
      'activatedStub',
      'deactivatedStub',
      'count',
    ]);
    expect(() => {
      // eslint-disable-next-line
      usePlugin(function bla() {
        return {};
      });
    }).toThrowError(/didn't match the type of the requested plugin/);
    return <div>Hello from Sandy{count}</div>;
  }

  type Events = {
    inc: {delta: number};
  };

  const plugin = (client: PluginClient<Events>) => {
    const count = createState(0);
    const connectedStub = jest.fn();
    const disconnectedStub = jest.fn();
    const activatedStub = jest.fn();
    const deactivatedStub = jest.fn();
    client.onConnect(connectedStub);
    client.onDisconnect(disconnectedStub);
    client.onActivate(activatedStub);
    client.onDeactivate(deactivatedStub);
    client.onMessage('inc', ({delta}) => {
      count.set(count.get() + delta);
    });
    return {
      connectedStub,
      disconnectedStub,
      activatedStub,
      deactivatedStub,
      count,
    };
  };

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin,
      Component: MySandyPlugin,
    },
  );
  const {
    renderer,
    act,
    sendMessage,
    client,
    store,
  } = await renderMockFlipperWithPlugin(definition);

  expect(client.rawSend).toBeCalledWith('init', {plugin: 'TestPlugin'});

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <div>
            Hello from Sandy
            0
          </div>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);
  expect(renders).toBe(1);

  // sending irrelevant message does not cause a re-render
  act(() => {
    sendMessage('oops', {delta: 2});
  });
  expect(renders).toBe(1);

  // sending a new message  cause a re-render
  act(() => {
    sendMessage('inc', {delta: 2});
  });
  expect(renders).toBe(2);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <div>
            Hello from Sandy
            2
          </div>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  // make sure the plugin gets connected
  const pluginInstance: ReturnType<
    typeof plugin
  > = client.sandyPluginStates.get(definition.id)!.instanceApi;
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(0);
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(0);

  // select non existing plugin
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: 'Logs',
        deepLinkPayload: null,
      }),
    );
  });

  expect(client.rawSend).toBeCalledWith('deinit', {plugin: 'TestPlugin'});

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(1);
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);

  // send some messages while in BG
  act(() => {
    sendMessage('inc', {delta: 3});
    sendMessage('inc', {delta: 4});
  });
  expect(renders).toBe(2);
  expect(pluginInstance.count.get()).toBe(2);

  // go back
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: null,
      }),
    );
  });
  // Might be needed, but seems to work reliable without: await sleep(1000);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <div>
            Hello from Sandy
            9
          </div>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  expect(pluginInstance.count.get()).toBe(9);
  expect(pluginInstance.connectedStub).toBeCalledTimes(2);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(1);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);
  expect(client.rawSend).toBeCalledWith('init', {plugin: 'TestPlugin'});

  // disable
  act(() => {
    store.dispatch(
      starPlugin({
        plugin: definition,
        selectedApp: client.query.app,
      }),
    );
  });
  expect(pluginInstance.connectedStub).toBeCalledTimes(2);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(2);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(2);
  expect(client.rawSend).toBeCalledWith('deinit', {plugin: 'TestPlugin'});

  // re-enable
  act(() => {
    store.dispatch(
      starPlugin({
        plugin: definition,
        selectedApp: client.query.app,
      }),
    );
  });
  // note: this is the old pluginInstance, so that one is not reconnected!
  expect(pluginInstance.connectedStub).toBeCalledTimes(2);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(2);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(2);

  expect(
    client.sandyPluginStates.get('TestPlugin')!.instanceApi.connectedStub,
  ).toBeCalledTimes(1);
  expect(client.rawSend).toBeCalledWith('init', {plugin: 'TestPlugin'});
  expect(
    client.sandyPluginStates.get('TestPlugin')!.instanceApi.count.get(),
  ).toBe(0);
});

test('PluginContainer triggers correct lifecycles for background plugin', async () => {
  function MySandyPlugin() {
    return <div>Hello from Sandy</div>;
  }

  const plugin = (client: PluginClient) => {
    const connectedStub = jest.fn();
    const disconnectedStub = jest.fn();
    const activatedStub = jest.fn();
    const deactivatedStub = jest.fn();
    client.onConnect(connectedStub);
    client.onDisconnect(disconnectedStub);
    client.onActivate(activatedStub);
    client.onDeactivate(deactivatedStub);
    return {connectedStub, disconnectedStub, activatedStub, deactivatedStub};
  };

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin,
      Component: MySandyPlugin,
    },
  );
  const {act, client, store} = await renderMockFlipperWithPlugin(definition, {
    onSend(method) {
      if (method === 'getBackgroundPlugins') {
        return {plugins: [definition.id]};
      }
    },
  });

  expect(client.rawSend).toBeCalledWith('init', {plugin: 'TestPlugin'});
  (client.rawSend as jest.Mock).mockClear();
  // make sure the plugin gets connected
  const pluginInstance: ReturnType<
    typeof plugin
  > = client.sandyPluginStates.get(definition.id)!.instanceApi;
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(0);
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(0);

  // select non existing plugin
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: 'Logs',
        deepLinkPayload: null,
      }),
    );
  });
  // bg plugin!
  expect(client.rawSend).not.toBeCalled();
  (client.rawSend as jest.Mock).mockClear();
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(0);
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);

  // go back
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: null,
      }),
    );
  });
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(0);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);
  expect(client.rawSend).not.toBeCalled();
  (client.rawSend as jest.Mock).mockClear();

  // disable
  act(() => {
    store.dispatch(
      starPlugin({
        plugin: definition,
        selectedApp: client.query.app,
      }),
    );
  });
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(1);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(2);
  expect(client.rawSend).toBeCalledWith('deinit', {plugin: 'TestPlugin'});
  (client.rawSend as jest.Mock).mockClear();

  // select something else
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: 'Logs',
        deepLinkPayload: null,
      }),
    );
  });
  // re-enable
  act(() => {
    store.dispatch(
      starPlugin({
        plugin: definition,
        selectedApp: client.query.app,
      }),
    );
  });
  // note: this is the old pluginInstance, so that one is not reconnected!
  expect(pluginInstance.connectedStub).toBeCalledTimes(1);
  expect(pluginInstance.disconnectedStub).toBeCalledTimes(1);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(2);

  const newPluginInstance: ReturnType<
    typeof plugin
  > = client.sandyPluginStates.get('TestPlugin')!.instanceApi;
  expect(newPluginInstance.connectedStub).toBeCalledTimes(1);
  expect(newPluginInstance.disconnectedStub).toBeCalledTimes(0);
  expect(newPluginInstance.activatedStub).toBeCalledTimes(0);
  expect(newPluginInstance.deactivatedStub).toBeCalledTimes(0);
  expect(client.rawSend).toBeCalledWith('init', {plugin: 'TestPlugin'});
  (client.rawSend as jest.Mock).mockClear();

  // select new plugin
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: null,
      }),
    );
  });

  expect(newPluginInstance.connectedStub).toBeCalledTimes(1);
  expect(newPluginInstance.disconnectedStub).toBeCalledTimes(0);
  expect(newPluginInstance.activatedStub).toBeCalledTimes(1);
  expect(newPluginInstance.deactivatedStub).toBeCalledTimes(0);
  expect(client.rawSend).not.toBeCalled();
  (client.rawSend as jest.Mock).mockClear();
});

test('PluginContainer + Sandy plugin supports deeplink', async () => {
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
        return <h1>hello {linkState || 'world'}</h1>;
      },
    },
  );
  const {renderer, act, client, store} = await renderMockFlipperWithPlugin(
    definition,
  );

  expect(client.rawSend).toBeCalledWith('init', {plugin: 'TestPlugin'});

  expect(linksSeen).toEqual([]);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <h1>
            hello 
            world
          </h1>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: 'universe!',
        selectedApp: client.query.app,
      }),
    );
  });

  expect(linksSeen).toEqual(['universe!']);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <h1>
            hello 
            universe!
          </h1>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  // Sending same link doesn't trigger again
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: 'universe!',
        selectedApp: client.query.app,
      }),
    );
  });
  expect(linksSeen).toEqual(['universe!']);

  // ...nor does a random other store update that does trigger a plugin container render
  act(() => {
    store.dispatch(
      updateSettings({
        ...store.getState().settingsState,
      }),
    );
  });
  expect(linksSeen).toEqual(['universe!']);

  // Different link does trigger again
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: 'london!',
        selectedApp: client.query.app,
      }),
    );
  });
  expect(linksSeen).toEqual(['universe!', 'london!']);

  // and same link does trigger if something else was selected in the mean time
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: 'Logs',
        deepLinkPayload: 'london!',
        selectedApp: client.query.app,
      }),
    );
  });
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: 'london!',
        selectedApp: client.query.app,
      }),
    );
  });
  expect(linksSeen).toEqual(['universe!', 'london!', 'london!']);
});

test('PluginContainer can render Sandy device plugins', async () => {
  let renders = 0;

  function MySandyPlugin() {
    renders++;
    const sandyApi = usePlugin(devicePlugin);
    expect(Object.keys(sandyApi)).toEqual([
      'activatedStub',
      'deactivatedStub',
      'lastLogMessage',
    ]);
    expect(() => {
      // eslint-disable-next-line
      usePlugin(function bla() {
        return {};
      });
    }).toThrowError(/didn't match the type of the requested plugin/);
    const lastLogMessage = useValue(sandyApi.lastLogMessage);
    return <div>Hello from Sandy: {lastLogMessage?.message}</div>;
  }

  const devicePlugin = (client: DevicePluginClient) => {
    const lastLogMessage = createState<undefined | DeviceLogEntry>(undefined);
    const activatedStub = jest.fn();
    const deactivatedStub = jest.fn();
    client.onActivate(activatedStub);
    client.onDeactivate(deactivatedStub);
    client.device.onLogEntry((e) => {
      lastLogMessage.set(e);
    });
    return {activatedStub, deactivatedStub, lastLogMessage};
  };

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      supportsDevice: () => true,
      devicePlugin,
      Component: MySandyPlugin,
    },
  );
  const {renderer, act, store, device} = await renderMockFlipperWithPlugin(
    definition,
  );

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <div>
            Hello from Sandy: 
          </div>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);
  expect(renders).toBe(1);

  act(() => {
    device.addLogEntry({
      date: new Date(),
      message: 'helleuh',
      pid: 0,
      tid: 0,
      type: 'info',
      tag: 'test',
    });
  });
  expect(renders).toBe(2);

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <div>
            Hello from Sandy: 
            helleuh
          </div>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  // make sure the plugin gets connected
  const pluginInstance: ReturnType<
    typeof devicePlugin
  > = device.sandyPluginStates.get(definition.id)!.instanceApi;
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(0);

  // select non existing plugin
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: 'Logs',
        deepLinkPayload: null,
      }),
    );
  });

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);

  // go back
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: null,
      }),
    );
  });
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);
});

test('PluginContainer + Sandy device plugin supports deeplink', async () => {
  const linksSeen: any[] = [];

  const devicePlugin = (client: DevicePluginClient) => {
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
      devicePlugin,
      supportsDevice: () => true,
      Component() {
        const instance = usePlugin(devicePlugin);
        const linkState = useValue(instance.linkState);
        return <h1>hello {linkState || 'world'}</h1>;
      },
    },
  );
  const {renderer, act, store} = await renderMockFlipperWithPlugin(definition);

  const theUniverse = {
    thisIs: 'theUniverse',
    toString() {
      return JSON.stringify({...this});
    },
  };

  expect(linksSeen).toEqual([]);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <h1>
            hello 
            world
          </h1>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: theUniverse,
        selectedApp: null,
      }),
    );
  });

  expect(linksSeen).toEqual([theUniverse]);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-w6yhx2-View-FlexBox-FlexColumn"
        >
          <h1>
            hello 
            {"thisIs":"theUniverse"}
          </h1>
        </div>
        <div
          class="css-o0040c-View-FlexBox-FlexRow"
          id="detailsSidebar"
        />
      </div>
    </body>
  `);

  // Sending same link doesn't trigger again
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: theUniverse,
        selectedApp: null,
      }),
    );
  });
  expect(linksSeen).toEqual([theUniverse]);

  // ...nor does a random other store update that does trigger a plugin container render
  act(() => {
    store.dispatch(
      updateSettings({
        ...store.getState().settingsState,
      }),
    );
  });
  expect(linksSeen).toEqual([theUniverse]);

  // Different link does trigger again
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: 'london!',
        selectedApp: null,
      }),
    );
  });
  expect(linksSeen).toEqual([theUniverse, 'london!']);

  // and same link does trigger if something else was selected in the mean time
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: 'Logs',
        deepLinkPayload: 'london!',
        selectedApp: null,
      }),
    );
  });
  act(() => {
    store.dispatch(
      selectPlugin({
        selectedPlugin: definition.id,
        deepLinkPayload: 'london!',
        selectedApp: null,
      }),
    );
  });
  expect(linksSeen).toEqual([theUniverse, 'london!', 'london!']);
});

test('Sandy plugins support isPluginSupported + selectPlugin', async () => {
  let renders = 0;
  const linksSeen: any[] = [];

  function MySandyPlugin() {
    renders++;
    return <h1>Plugin1</h1>;
  }

  const plugin = (client: PluginClient) => {
    const activatedStub = jest.fn();
    const deactivatedStub = jest.fn();
    client.onDeepLink((link) => {
      linksSeen.push(link);
    });
    client.onActivate(activatedStub);
    client.onDeactivate(deactivatedStub);
    return {
      activatedStub,
      deactivatedStub,
      isPluginAvailable: client.isPluginAvailable,
      selectPlugin: client.selectPlugin,
    };
  };

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({id: 'base'}),
    {
      plugin,
      Component: MySandyPlugin,
    },
  );
  const definition2 = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({id: 'other'}),
    {
      plugin() {
        return {};
      },
      Component() {
        return <h1>Plugin2</h1>;
      },
    },
  );
  const definition3 = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({id: 'device'}),
    {
      supportsDevice() {
        return true;
      },
      devicePlugin() {
        return {};
      },
      Component() {
        return <h1>Plugin3</h1>;
      },
    },
  );
  const {renderer, client, store} = await renderMockFlipperWithPlugin(
    definition,
    {
      additionalPlugins: [definition2, definition3],
      dontEnableAdditionalPlugins: true,
    },
  );

  expect(renderer.baseElement.querySelector('h1')).toMatchInlineSnapshot(`
    <h1>
      Plugin1
    </h1>
  `);
  expect(renders).toBe(1);

  const pluginInstance: ReturnType<
    typeof plugin
  > = client.sandyPluginStates.get(definition.id)!.instanceApi;
  expect(pluginInstance.isPluginAvailable(definition.id)).toBeTruthy();
  expect(pluginInstance.isPluginAvailable('nonsense')).toBeFalsy();
  expect(pluginInstance.isPluginAvailable(definition2.id)).toBeFalsy(); // not enabled yet
  expect(pluginInstance.isPluginAvailable(definition3.id)).toBeFalsy(); // not enabled yet
  expect(pluginInstance.activatedStub).toBeCalledTimes(1);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(0);
  expect(linksSeen).toEqual([]);

  // star and navigate to a device plugin
  store.dispatch(starPlugin({plugin: definition3}));
  pluginInstance.selectPlugin(definition3.id);
  expect(pluginInstance.isPluginAvailable(definition3.id)).toBeTruthy();
  expect(store.getState().connections.selectedPlugin).toBe(definition3.id);
  expect(renderer.baseElement.querySelector('h1')).toMatchInlineSnapshot(`
    <h1>
      Plugin3
    </h1>
  `);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(1);

  // go back by opening own plugin again (funny, but why not)
  pluginInstance.selectPlugin(definition.id, 'data');
  expect(store.getState().connections.selectedPlugin).toBe(definition.id);
  expect(pluginInstance.activatedStub).toBeCalledTimes(2);
  expect(renderer.baseElement.querySelector('h1')).toMatchInlineSnapshot(`
    <h1>
      Plugin1
    </h1>
  `);
  expect(linksSeen).toEqual(['data']);

  // try to go to plugin 2, fails (not starred, so no-op)
  pluginInstance.selectPlugin(definition2.id);
  expect(store.getState().connections.selectedPlugin).toBe(definition.id);

  // star plugin 2 and navigate to plugin 2
  store.dispatch(
    starPlugin({
      plugin: definition2,
      selectedApp: client.query.app,
    }),
  );
  pluginInstance.selectPlugin(definition2.id);
  expect(store.getState().connections.selectedPlugin).toBe(definition2.id);
  expect(pluginInstance.deactivatedStub).toBeCalledTimes(2);
  expect(renderer.baseElement.querySelector('h1')).toMatchInlineSnapshot(`
    <h1>
      Plugin2
    </h1>
  `);
  expect(renders).toBe(2);
});

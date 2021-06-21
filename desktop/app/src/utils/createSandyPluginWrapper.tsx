/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {
  createState,
  useLogger,
  usePlugin,
  useValue,
  _SandyPluginDefinition,
  PluginClient,
  DevicePluginClient,
} from 'flipper-plugin';
import {useEffect} from 'react';
import {
  BaseAction,
  FlipperDevicePlugin,
  FlipperPlugin,
  Props as PluginProps,
} from '../plugin';
import {useDispatch, useStore} from './useStore';
import {setStaticView, StaticView} from '../reducers/connections';

export type SandyPluginModule = ConstructorParameters<
  typeof _SandyPluginDefinition
>[1];

// Wrapped features
// exportPersistedState
// getActiveNotifications
// serializePersistedState
// static deserializePersistedState: (

export function createSandyPluginWrapper<S, A extends BaseAction, P>(
  Plugin: typeof FlipperPlugin | typeof FlipperDevicePlugin,
): SandyPluginModule {
  const isDevicePlugin = Plugin.prototype instanceof FlipperDevicePlugin;
  console.warn(
    `Loading ${isDevicePlugin ? 'device' : 'client'} plugin ${
      Plugin.id
    } in legacy mode. Please visit https://fbflipper.com/docs/extending/sandy-migration to learn how to migrate this plugin to the new Sandy architecture`,
  );

  function plugin(client: PluginClient | DevicePluginClient) {
    const appClient = isDevicePlugin ? undefined : (client as PluginClient);
    const instanceRef = React.createRef<FlipperPlugin<S, A, P> | null>();

    const persistedState = createState<P>(Plugin.defaultPersistedState, {
      persist: 'persistedState',
    });
    const deeplink = createState<unknown>();

    client.onDeepLink((link) => {
      deeplink.set(link);
    });

    appClient?.onUnhandledMessage((event, params) => {
      if (Plugin.persistedStateReducer) {
        persistedState.set(
          Plugin.persistedStateReducer(persistedState.get(), event, params),
        );
      }
    });

    if (Plugin.keyboardActions) {
      function executeKeyboardAction(action: string) {
        instanceRef?.current?.onKeyboardAction?.(action);
      }

      client.addMenuEntry(
        ...Plugin.keyboardActions.map((def) => {
          if (typeof def === 'string') {
            return {
              action: def,
              handler() {
                executeKeyboardAction(def);
              },
            };
          } else {
            const {action, label, accelerator, topLevelMenu} = def;
            return {
              label,
              accelerator,
              topLevelMenu,
              handler() {
                executeKeyboardAction(action);
              },
            };
          }
        }),
      );
    }

    return {
      instanceRef,
      device: client.device.realDevice,
      persistedState,
      deeplink,
      selectPlugin: client.selectPlugin,
      setPersistedState(state: Partial<P>) {
        persistedState.set({...persistedState.get(), ...state});
      },
      get appId() {
        return appClient?.appId;
      },
      get appName() {
        return appClient?.appName ?? null;
      },
      get isArchived() {
        return client.device.isArchived;
      },
    };
  }

  function Component() {
    const instance = usePlugin(plugin);
    const logger = useLogger();
    const persistedState = useValue(instance.persistedState);
    const deepLinkPayload = useValue(instance.deeplink);
    const dispatch = useDispatch();

    const target = isDevicePlugin
      ? instance.device
      : // eslint-disable-next-line
          useStore((state) =>
          state.connections.clients.find((c) => c.id === instance.appId),
        );
    if (!target) {
      throw new Error('Illegal state: missing target');
    }

    const settingsState = useStore((state) => state.settingsState);

    useEffect(function triggerInitAndTeardown() {
      const ref = instance.instanceRef.current!;
      ref._init();
      return () => {
        ref._teardown();
      };
    }, []);

    const props: PluginProps<P> = {
      logger,
      persistedState,
      target,
      deepLinkPayload,
      settingsState,
      setPersistedState: instance.setPersistedState,
      selectPlugin: instance.selectPlugin,
      isArchivedDevice: instance.isArchived,
      selectedApp: instance.appName,
      setStaticView(payload: StaticView) {
        dispatch(setStaticView(payload));
      },
      // @ts-ignore ref is not on Props
      ref: instance.instanceRef,
    };

    return React.createElement(Plugin, props);
  }

  return isDevicePlugin
    ? {devicePlugin: plugin, Component}
    : {
        plugin,
        Component,
      };
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {remote, ipcRenderer, IpcRendererEvent} from 'electron';
import {toggleAction} from '../reducers/application';
import {setStaticView} from '../reducers/connections';
import {selectedPlugins as setSelectedPlugins} from '../reducers/plugins';
import {starPlugin as setStarPlugin} from '../reducers/connections';
import {setSupportFormV2State, Groups} from '../reducers/supportForm';
import {addStatusMessage, removeStatusMessage} from '../reducers/application';
import {Store} from '../reducers/index.js';
import {Logger} from '../fb-interfaces/Logger';
import {parseFlipperPorts} from '../utils/environmentVariables';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';
import {
  importDataToStore,
  importFileToStore,
  IMPORT_FLIPPER_TRACE_EVENT,
} from '../utils/exportData';
import {tryCatchReportPlatformFailures} from '../utils/metrics';
import {deconstructClientId} from '../utils/clientUtils';
import {defaultSelectedPluginsForGroup} from '../fb-stubs/utils/supportForm';
import {selectPlugin} from '../reducers/connections';
import qs from 'query-string';
import {showStatusUpdatesForDuration} from '../utils/promiseTimeout';

export const uriComponents = (url: string): Array<string> => {
  if (!url) {
    return [];
  }
  const match: Array<string> | undefined | null = url.match(
    /^flipper:\/\/([^\/]*)\/([^\/]*)\/?(.*)$/,
  );
  if (match) {
    return match
      .map(decodeURIComponent)
      .slice(1)
      .filter(Boolean);
  }
  return [];
};

export default (store: Store, logger: Logger) => {
  const currentWindow = remote.getCurrentWindow();
  currentWindow.on('focus', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: {isFocused: true, time: Date.now()},
    });
  });
  currentWindow.on('blur', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: {isFocused: false, time: Date.now()},
    });
  });

  // windowIsFocussed is initialized in the store before the app is fully ready.
  // So wait until everything is up and running and then check and set the isFocussed state.
  window.addEventListener('flipper-store-ready', () => {
    const isFocused = currentWindow.isFocused();
    store.dispatch({
      type: 'windowIsFocused',
      payload: {isFocused: isFocused, time: Date.now()},
    });
  });

  ipcRenderer.on(
    'flipper-protocol-handler',
    (_event: IpcRendererEvent, query: string) => {
      const uri = new URL(query);
      if (query.startsWith('flipper://import')) {
        const {search} = new URL(query);
        const {url} = qs.parse(search);
        store.dispatch(toggleAction('downloadingImportData', true));
        return (
          typeof url === 'string' &&
          fetch(url)
            .then(res => res.text())
            .then(data => importDataToStore(url, data, store))
            .then(() => {
              store.dispatch(toggleAction('downloadingImportData', false));
            })
            .catch((e: Error) => {
              console.error(e);
              store.dispatch(toggleAction('downloadingImportData', false));
            })
        );
      } else if (
        uri.protocol === 'flipper:' &&
        uri.pathname.includes('support-form')
      ) {
        const formParam = uri.searchParams.get('form');
        const grps = deeplinkFormParamToGroups(formParam);
        if (grps) {
          handleSupportFormDeeplinks(grps);
        }
        return;
      }
      const match = uriComponents(query);
      if (match.length > 1) {
        // flipper://<client>/<pluginId>/<payload>
        return store.dispatch(
          selectPlugin({
            selectedApp: match[0],
            selectedPlugin: match[1],
            deepLinkPayload: match[2],
          }),
        );
      }
    },
  );

  function deeplinkFormParamToGroups(formParam: string | null): Groups | null {
    if (!formParam) {
      return null;
    }
    if (formParam.toLowerCase() === 'litho') {
      return 'Litho Support';
    } else if (formParam.toLowerCase() === 'graphql_android') {
      return 'GraphQL Android Support';
    } else if (formParam.toLowerCase() === 'graphql_ios') {
      return 'GraphQL iOS Support';
    }
    return null;
  }

  function handleSupportFormDeeplinks(grp: Groups) {
    logger.track('usage', 'support-form-source', {source: 'deeplink'});
    // TODO: Incorporate grp info in analytics.
    store.dispatch(setStaticView(SupportRequestFormV2));
    const selectedApp = store.getState().connections.selectedApp;
    if (
      (grp === 'GraphQL Android Support' || grp === 'GraphQL iOS Support') &&
      selectedApp
    ) {
      // Enable GraphQL plugin if grp to be posted is the GraphQL one.
      // TODO: Handle the case where GraphQL plugin is not supported by Client
      const {app} = deconstructClientId(selectedApp);
      const selectedClient = store
        .getState()
        .connections.clients.find(client => client.id === selectedApp);
      const enabledPlugins: Array<string> | null = store.getState().connections
        .userStarredPlugins[app];
      const graphQLEnabled =
        enabledPlugins != null && enabledPlugins.includes('GraphQL');
      if (
        selectedClient &&
        selectedClient.plugins.includes('GraphQL') &&
        !graphQLEnabled
      ) {
        store.dispatch(
          setStarPlugin({
            selectedApp: app,
            selectedPlugin: 'GraphQL',
          }),
        );
      } else if (
        !selectedClient ||
        !selectedClient.plugins.includes('GraphQL')
      ) {
        showStatusUpdatesForDuration(
          'The current client does not support GraphQL plugin. Please change the app from the dropdown in the support form',
          'Deeplink',
          10000,
          payload => {
            store.dispatch(addStatusMessage(payload));
          },
          payload => {
            store.dispatch(removeStatusMessage(payload));
          },
        );
      }
    }
    store.dispatch(
      setSupportFormV2State({
        ...store.getState().supportForm.supportFormV2,
        selectedGroup: grp,
      }),
    );
    const selectedClient = store.getState().connections.clients.find(o => {
      return o.id === store.getState().connections.selectedApp;
    });
    store.dispatch(
      setSelectedPlugins(
        defaultSelectedPluginsForGroup(
          grp,
          store.getState().plugins,
          selectedClient,
          store.getState().connections.userStarredPlugins,
        ),
      ),
    );
  }

  ipcRenderer.on(
    'open-flipper-file',
    (_event: IpcRendererEvent, url: string) => {
      tryCatchReportPlatformFailures(() => {
        return importFileToStore(url, store);
      }, `${IMPORT_FLIPPER_TRACE_EVENT}:Deeplink`);
    },
  );

  if (process.env.FLIPPER_PORTS) {
    const portOverrides = parseFlipperPorts(process.env.FLIPPER_PORTS);
    if (portOverrides) {
      store.dispatch({
        type: 'SET_SERVER_PORTS',
        payload: portOverrides,
      });
    } else {
      console.error(
        `Ignoring malformed FLIPPER_PORTS env variable:
        "${process.env.FLIPPER_PORTS || ''}".
        Example expected format: "1111,2222".`,
      );
    }
  }
};

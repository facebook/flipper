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
import {Group, SUPPORTED_GROUPS} from '../reducers/supportForm';
import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {parseFlipperPorts} from '../utils/environmentVariables';
import {
  importDataToStore,
  importFileToStore,
  IMPORT_FLIPPER_TRACE_EVENT,
} from '../utils/exportData';
import {tryCatchReportPlatformFailures} from '../utils/metrics';
import {selectPlugin} from '../reducers/connections';
import qs from 'query-string';

export const uriComponents = (url: string): Array<string> => {
  if (!url) {
    return [];
  }
  const match: Array<string> | undefined | null = url.match(
    /^flipper:\/\/([^\/]*)\/([^\/\?]*)\/?(.*)$/,
  );
  if (match) {
    return match.map(decodeURIComponent).slice(1).filter(Boolean);
  }
  return [];
};

export default (store: Store, _logger: Logger) => {
  const currentWindow = remote.getCurrentWindow();
  currentWindow.on('focus', () => {
    setImmediate(() => {
      store.dispatch({
        type: 'windowIsFocused',
        payload: {isFocused: true, time: Date.now()},
      });
    });
  });
  currentWindow.on('blur', () => {
    setImmediate(() => {
      store.dispatch({
        type: 'windowIsFocused',
        payload: {isFocused: false, time: Date.now()},
      });
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
            .then((res) => res.text())
            .then((data) => importDataToStore(url, data, store))
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
        const grp = deeplinkFormParamToGroups(formParam);
        if (grp) {
          grp.handleSupportFormDeeplinks(store);
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

  function deeplinkFormParamToGroups(
    formParam: string | null,
  ): Group | undefined {
    if (!formParam) {
      return undefined;
    }
    return SUPPORTED_GROUPS.find((grp) => {
      return grp.deeplinkSuffix.toLowerCase() === formParam.toLowerCase();
    });
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

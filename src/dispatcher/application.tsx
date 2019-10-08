/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {remote, ipcRenderer} from 'electron';
import {toggleAction} from '../reducers/application';
import {setStaticView} from '../reducers/connections';
import {Store} from '../reducers/index.js';
import {Logger} from '../fb-interfaces/Logger';
import {parseFlipperPorts} from '../utils/environmentVariables';
import SupportRequestFormManager from '../fb-stubs/SupportRequestFormManager';
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
      payload: true,
    });
  });
  currentWindow.on('blur', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: false,
    });
  });

  ipcRenderer.on(
    'flipper-protocol-handler',
    (_event: string, query: string) => {
      if (query.startsWith('flipper://import')) {
        const {search} = new URL(query);
        const {url} = qs.parse(search);
        store.dispatch(toggleAction('downloadingImportData', true));
        return (
          typeof url === 'string' &&
          fetch(url)
            .then(res => res.text())
            .then(data => importDataToStore(data, store))
            .then(() => {
              store.dispatch(toggleAction('downloadingImportData', false));
            })
            .catch((e: Error) => {
              console.error(e);
              store.dispatch(toggleAction('downloadingImportData', false));
            })
        );
      } else if (query === 'flipper://support-form?form=Litho') {
        store.dispatch(setStaticView(SupportRequestFormManager));
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

  ipcRenderer.on('open-flipper-file', (_event: string, url: string) => {
    tryCatchReportPlatformFailures(() => {
      return importFileToStore(url, store);
    }, `${IMPORT_FLIPPER_TRACE_EVENT}:Deeplink`);
  });

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

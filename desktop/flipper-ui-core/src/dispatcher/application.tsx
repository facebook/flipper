/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from 'flipper-common';
import {
  importDataToStore,
  IMPORT_FLIPPER_TRACE_EVENT,
} from '../utils/exportData';
import {tryCatchReportPlatformFailures} from 'flipper-common';
import {handleDeeplink} from '../deeplink';
import {Dialog} from 'flipper-plugin';
import {getRenderHostInstance} from 'flipper-frontend-core';

export default (store: Store, logger: Logger) => {
  const renderHost = getRenderHostInstance();

  const onFocus = () => {
    setTimeout(() => {
      store.dispatch({
        type: 'windowIsFocused',
        payload: {isFocused: true, time: Date.now()},
      });
    }, 1);
  };
  const onBlur = () => {
    setTimeout(() => {
      store.dispatch({
        type: 'windowIsFocused',
        payload: {isFocused: false, time: Date.now()},
      });
    }, 1);
  };
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('blur', onBlur);
  });

  // windowIsFocussed is initialized in the store before the app is fully ready.
  // So wait until everything is up and running and then check and set the isFocussed state.
  window.addEventListener('flipper-store-ready', () => {
    const isFocused = renderHost.hasFocus();
    store.dispatch({
      type: 'windowIsFocused',
      payload: {isFocused: isFocused, time: Date.now()},
    });
  });

  renderHost.onIpcEvent('flipper-protocol-handler', (query: string) => {
    handleDeeplink(store, logger, query).catch((e) => {
      console.warn('Failed to handle deeplink', query, e);
      Dialog.alert({
        title: 'Failed to open deeplink',
        type: 'error',
        message: `Failed to handle deeplink '${query}': ${
          e.message ?? e.toString()
        }`,
      });
    });
  });

  renderHost.onIpcEvent('open-flipper-file', (name: string, data: string) => {
    tryCatchReportPlatformFailures(() => {
      return importDataToStore(name, data, store);
    }, `${IMPORT_FLIPPER_TRACE_EVENT}:Deeplink`);
  });
};

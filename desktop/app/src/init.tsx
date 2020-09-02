/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Provider} from 'react-redux';
import ReactDOM from 'react-dom';
import {useState, useEffect} from 'react';

import ContextMenuProvider from './ui/components/ContextMenuProvider';
import GK from './fb-stubs/GK';
import {init as initLogger} from './fb-stubs/Logger';
import App from './App';
import setupPrefetcher from './fb-stubs/Prefetcher';
import {persistStore} from 'redux-persist';
import {Store} from './reducers/index';
import dispatcher from './dispatcher/index';
import TooltipProvider from './ui/components/TooltipProvider';
import config from './utils/processConfig';
import {initLauncherHooks} from './utils/launcher';
import fbConfig from './fb-stubs/config';
import {isFBEmployee} from './utils/fbEmployee';
import WarningEmployee from './chrome/WarningEmployee';
import {setPersistor} from './utils/persistor';
import React from 'react';
import path from 'path';
import {store} from './store';
import {registerRecordingHooks} from './utils/pluginStateRecorder';
import {cache} from 'emotion';
import {CacheProvider} from '@emotion/core';
import {enableMapSet} from 'immer';
import os from 'os';
import QuickPerformanceLogger, {FLIPPER_QPL_EVENTS} from './fb-stubs/QPL';
import {PopoverProvider} from './ui/components/PopoverProvider';
import {initializeFlipperLibImplementation} from './utils/flipperLibImplementation';
import {enableConsoleHook} from './chrome/ConsoleLogs';

if (process.env.NODE_ENV === 'development' && os.platform() === 'darwin') {
  // By default Node.JS has its internal certificate storage and doesn't use
  // the system store. Because of this, it's impossible to access ondemand / devserver
  // which are signed using some internal self-issued FB certificates. These certificates
  // are automatically installed to MacOS system store on FB machines, so here we're using
  // this "mac-ca" library to load them into Node.JS.
  global.electronRequire('mac-ca');
}

const [s, ns] = process.hrtime();
const launchTime = s * 1e3 + ns / 1e6;

const logger = initLogger(store);

QuickPerformanceLogger.markerStart(FLIPPER_QPL_EVENTS.STARTUP, 0, launchTime);

enableMapSet();

GK.init();

const AppFrame = () => {
  const [warnEmployee, setWarnEmployee] = useState(false);
  useEffect(() => {
    if (fbConfig.warnFBEmployees) {
      isFBEmployee().then((isEmployee) => {
        setWarnEmployee(isEmployee);
      });
    }
  }, []);

  return (
    <TooltipProvider>
      <PopoverProvider>
        <ContextMenuProvider>
          <Provider store={store}>
            <CacheProvider value={cache}>
              {warnEmployee ? (
                <WarningEmployee
                  onClick={() => {
                    setWarnEmployee(false);
                  }}
                />
              ) : (
                <App logger={logger} />
              )}
            </CacheProvider>
          </Provider>
        </ContextMenuProvider>
      </PopoverProvider>
    </TooltipProvider>
  );
};

function setProcessState(store: Store) {
  const settings = store.getState().settingsState;
  const androidHome = settings.androidHome;

  if (!process.env.ANDROID_HOME) {
    process.env.ANDROID_HOME = androidHome;
  }

  // emulator/emulator is more reliable than tools/emulator, so prefer it if
  // it exists
  process.env.PATH =
    ['emulator', 'tools', 'platform-tools']
      .map((directory) => path.resolve(androidHome, directory))
      .join(':') + `:${process.env.PATH}`;

  window.requestIdleCallback(() => {
    setupPrefetcher(settings);
  });
}

function init() {
  initializeFlipperLibImplementation(store, logger);
  ReactDOM.render(<AppFrame />, document.getElementById('root'));
  initLauncherHooks(config(), store);
  const sessionId = store.getState().application.sessionId;
  registerRecordingHooks(store);
  enableConsoleHook();
  window.flipperGlobalStoreDispatch = store.dispatch;
}

// rehydrate app state before exposing init
const persistor = persistStore(store, undefined, () => {
  // Make sure process state is set before dispatchers run
  setProcessState(store);
  dispatcher(store, logger);
  // make init function callable from outside
  window.Flipper.init = init;
  window.dispatchEvent(new Event('flipper-store-ready'));
});

setPersistor(persistor);

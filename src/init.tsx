/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Provider} from 'react-redux';
import ReactDOM from 'react-dom';
import {useState, useEffect} from 'react';
import ContextMenuProvider from './ui/components/ContextMenuProvider.js';
import GK from './fb-stubs/GK';
import {init as initLogger} from './fb-stubs/Logger';
import App from './App';
import BugReporter from './fb-stubs/BugReporter';
import setupPrefetcher from './fb-stubs/Prefetcher';
import {createStore} from 'redux';
import {persistStore} from 'redux-persist';
import reducers, {Actions, State as StoreState} from './reducers/index';
import dispatcher from './dispatcher/index';
import TooltipProvider from './ui/components/TooltipProvider.js';
import config from './utils/processConfig';
import {stateSanitizer} from './utils/reduxDevToolsConfig';
import {initLauncherHooks} from './utils/launcher';
import initCrashReporter from './utils/electronCrashReporter';
import fbConfig from './fb-stubs/config';
import {isFBEmployee} from './utils/fbEmployee';
import WarningEmployee from './chrome/WarningEmployee';
import React from 'react';

const store = createStore<StoreState, Actions, any, any>(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__({
        // @ts-ignore
        stateSanitizer,
      })
    : undefined,
);

const logger = initLogger(store);
const bugReporter = new BugReporter(logger, store);

GK.init();

const AppFrame = () => {
  const [warnEmployee, setWarnEmployee] = useState(false);
  useEffect(() => {
    if (fbConfig.warnFBEmployees) {
      isFBEmployee().then(isEmployee => {
        setWarnEmployee(isEmployee);
      });
    }
  }, []);

  return (
    <TooltipProvider>
      <ContextMenuProvider>
        <Provider store={store}>
          {warnEmployee ? (
            <WarningEmployee
              onClick={() => {
                setWarnEmployee(false);
              }}
            />
          ) : (
            <App logger={logger} bugReporter={bugReporter} />
          )}
        </Provider>
      </ContextMenuProvider>
    </TooltipProvider>
  );
};

function init() {
  ReactDOM.render(<AppFrame />, document.getElementById('root'));
  initLauncherHooks(config(), store);
  const sessionId = store.getState().application.sessionId;
  initCrashReporter(sessionId || '');

  window.requestIdleCallback(() => {
    setupPrefetcher();
  });
}

// rehydrate app state before exposing init
persistStore(store, null, () => {
  dispatcher(store, logger);
  // make init function callable from outside
  window.Flipper.init = init;
});

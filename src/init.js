/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Provider} from 'react-redux';
import ReactDOM from 'react-dom';
import {ContextMenuProvider} from 'flipper';
import GK from './fb-stubs/GK.tsx';
import {init as initLogger} from './fb-stubs/Logger';
import App from './App.js';
import BugReporter from './fb-stubs/BugReporter.js';
import setupPrefetcher from './fb-stubs/Prefetcher.js';
import {createStore} from 'redux';
import {persistStore} from 'redux-persist';
import reducers from './reducers/index.tsx';
import dispatcher from './dispatcher/index.js';
import TooltipProvider from './ui/components/TooltipProvider.js';
import config from './utils/processConfig.js';
import {stateSanitizer} from './utils/reduxDevToolsConfig.js';
import {initLauncherHooks} from './utils/launcher.js';
import initCrashReporter from './utils/electronCrashReporter';
import path from 'path';

const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ &&
    window.__REDUX_DEVTOOLS_EXTENSION__({stateSanitizer}),
);

const logger = initLogger(store);
const bugReporter = new BugReporter(logger, store);

GK.init();

const AppFrame = () => (
  <TooltipProvider>
    <ContextMenuProvider>
      <Provider store={store}>
        <App logger={logger} bugReporter={bugReporter} />
      </Provider>
    </ContextMenuProvider>
  </TooltipProvider>
);

function init() {
  // $FlowFixMe: this element exists!
  ReactDOM.render(<AppFrame />, document.getElementById('root'));
  initLauncherHooks(config(), store);
  const sessionId = store.getState().application.sessionId;
  initCrashReporter(sessionId || '');

  requestIdleCallback(() => {
    setupPrefetcher();
  });
}

// rehydrate app state before exposing init
persistStore(store, null, () => {
  dispatcher(store, logger);
  // make init function callable from outside
  window.Flipper.init = init;
});

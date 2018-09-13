/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Provider} from 'react-redux';
import ReactDOM from 'react-dom';
import {ContextMenuProvider} from 'sonar';
import {precachedIcons} from './utils/icons.js';
import GK from './fb-stubs/GK.js';
import Logger from './fb-stubs/Logger.js';
import App from './App.js';
import BugReporter from './fb-stubs/BugReporter.js';
import {createStore} from 'redux';
import {persistStore, persistReducer} from 'redux-persist';
import createFilter from 'redux-persist-transform-filter';
import storage from 'redux-persist/lib/storage/index.js';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import reducers from './reducers/index.js';
import dispatcher from './dispatcher/index.js';
import {setupMenuBar} from './MenuBar.js';
import TooltipProvider from './ui/components/TooltipProvider.js';
const path = require('path');

const reducer: typeof reducers = persistReducer(
  {
    key: 'root',
    stateReconciler: autoMergeLevel2,
    transforms: [
      createFilter('connections', [
        'userPreferredDevice',
        'userPreferredPlugin',
        'userPreferredApp',
      ]),
    ],
    storage,
  },
  reducers,
);

const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
);
persistStore(store);

const logger = new Logger();
const bugReporter = new BugReporter(logger);
dispatcher(store, logger);
GK.init();
setupMenuBar();

const AppFrame = () => (
  <TooltipProvider>
    <ContextMenuProvider>
      <Provider store={store}>
        <App logger={logger} bugReporter={bugReporter} />
      </Provider>
    </ContextMenuProvider>
  </TooltipProvider>
);

export default function init() {
  // $FlowFixMe: this element exists!
  ReactDOM.render(<AppFrame />, document.getElementById('root'));
  // $FlowFixMe: service workers exist!
  navigator.serviceWorker
    .register(
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'serviceWorker.js')
        : './serviceWorker.js',
    )
    .then(r => {
      (r.installing || r.active).postMessage({precachedIcons});
    })
    .catch(console.error);
}

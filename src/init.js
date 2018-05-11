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
import App from './App.js';
import {createStore} from 'redux';
import reducers from './reducers/index.js';
import dispatcher from './dispatcher/index.js';
const path = require('path');

const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
);

dispatcher(store);

GK.init();

const AppFrame = () => (
  <ContextMenuProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </ContextMenuProvider>
);

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

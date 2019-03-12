/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type {Logger} from '../fb-interfaces/Logger.js';
import {login} from '../reducers/user';
import {getUser, logoutUser} from '../fb-stubs/user';

export default (store: Store, logger: Logger) => {
  getUser()
    .then(user => {
      store.dispatch(login(user));
    })
    .catch(console.debug);

  let prevUserName = store.getState().user.name;
  store.subscribe(() => {
    if (prevUserName && !store.getState().user.name) {
      logoutUser();
    }
    prevUserName = store.getState().user.name;
  });
};

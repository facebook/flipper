/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {login, logout} from '../reducers/user';
import {getUser, logoutUser} from '../fb-stubs/user';

export default (store: Store, _logger: Logger) => {
  getUser()
    .then(user => {
      store.dispatch(login(user));
    })
    .catch(e => {
      store.dispatch(logout());
      console.error(e);
    });

  let prevUserName = store.getState().user.name;
  store.subscribe(() => {
    if (prevUserName && !store.getState().user.name) {
      logoutUser();
    }
    prevUserName = store.getState().user.name;
  });
};

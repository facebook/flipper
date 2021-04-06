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
import {sideEffect} from '../utils/sideEffect';
import config from '../fb-stubs/config';

export default (store: Store, _logger: Logger) => {
  if (!config.isFBBuild) {
    return;
  }

  getUser()
    .then((user) => {
      if (user) {
        store.dispatch(login(user));
      } else {
        store.dispatch(logout());
      }
    })
    .catch((e) => {
      store.dispatch(logout());
      console.error(e);
    });

  let prevUserName = store.getState().user.name;
  sideEffect(
    store,
    {name: 'logout', throttleMs: 500},
    (state) => state.user.name,
    (userName) => {
      if (prevUserName && !userName) {
        logoutUser();
      }
      prevUserName = userName;
    },
  );
};

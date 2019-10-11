/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import reducer from '../connections';
import {State} from '../connections';
import BaseDevice from '../../devices/BaseDevice';

test('REGISTER_DEVICE doesnt remove error', () => {
  const initialState: State = reducer(undefined, {
    type: 'SERVER_ERROR',
    payload: 'something went wrong',
  });

  // Precondition
  expect(initialState.error).toEqual('something went wrong');

  const endState = reducer(initialState, {
    type: 'REGISTER_DEVICE',
    payload: new BaseDevice('serial', 'physical', 'title', 'Android'),
  });

  expect(endState.error).toEqual('something went wrong');
});

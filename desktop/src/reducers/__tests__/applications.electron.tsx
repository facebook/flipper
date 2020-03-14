/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import reducer from '../application';
import {
  initialState,
  addStatusMessage,
  removeStatusMessage,
} from '../application';

test('ADD_STATUS_MSG, to check if the status messages get pushed to the state', () => {
  const state = reducer(
    initialState(),
    addStatusMessage({msg: 'Status Msg', sender: 'Test'}),
  );
  expect(state.statusMessages).toEqual(['Test: Status Msg']);
  const updatedstate = reducer(
    state,
    addStatusMessage({msg: 'Status Msg 2', sender: 'Test'}),
  );
  expect(updatedstate.statusMessages).toEqual([
    'Test: Status Msg',
    'Test: Status Msg 2',
  ]);
});

test('REMOVE_STATUS_MSG, to check if the status messages gets removed from the state', () => {
  const initState = initialState();
  const state = reducer(
    initState,
    removeStatusMessage({msg: 'Status Msg', sender: 'Test'}),
  );
  expect(state).toEqual(initState);
  const stateWithMessages = reducer(
    reducer(
      initialState(),
      addStatusMessage({msg: 'Status Msg', sender: 'Test'}),
    ),
    addStatusMessage({msg: 'Status Msg 2', sender: 'Test'}),
  );
  const updatedState = reducer(
    stateWithMessages,
    removeStatusMessage({msg: 'Status Msg', sender: 'Test'}),
  );
  expect(updatedState.statusMessages).toEqual(['Test: Status Msg 2']);
  const updatedStateWithNoMessages = reducer(
    updatedState,
    removeStatusMessage({msg: 'Status Msg 2', sender: 'Test'}),
  );
  expect(updatedStateWithNoMessages.statusMessages).toEqual([]);
});

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
    payload: {message: 'something went wrong'},
  });

  // Precondition
  expect(initialState.errors).toEqual([
    {message: 'something went wrong', occurrences: 1},
  ]);

  const endState = reducer(initialState, {
    type: 'REGISTER_DEVICE',
    payload: new BaseDevice('serial', 'physical', 'title', 'Android'),
  });

  expect(endState.errors).toEqual([
    {message: 'something went wrong', occurrences: 1},
  ]);
});

test('errors are collected on a by name basis', () => {
  const initialState: State = reducer(undefined, {
    type: 'SERVER_ERROR',
    payload: {
      message: 'error1',
      error: 'stack1',
    },
  });

  expect(initialState.errors).toMatchInlineSnapshot(`
        Array [
          Object {
            "error": "stack1",
            "message": "error1",
            "occurrences": 1,
          },
        ]
    `);

  const state2: State = reducer(initialState, {
    type: 'SERVER_ERROR',
    payload: {
      message: 'error2',
      error: 'stack2',
    },
  });
  // There are now two errors
  expect(state2.errors).toMatchInlineSnapshot(`
        Array [
          Object {
            "error": "stack1",
            "message": "error1",
            "occurrences": 1,
          },
          Object {
            "error": "stack2",
            "message": "error2",
            "occurrences": 1,
          },
        ]
    `);
  const state3: State = reducer(state2, {
    type: 'SERVER_ERROR',
    payload: {
      message: 'error1',
      error: 'stack3',
    },
  });
  // Still two errors, but error1 has been updated and occurrences increased
  expect(state3.errors).toMatchInlineSnapshot(`
    Array [
      Object {
        "error": "stack3",
        "message": "error1",
        "occurrences": 2,
      },
      Object {
        "error": "stack2",
        "message": "error2",
        "occurrences": 1,
      },
    ]
  `);
});

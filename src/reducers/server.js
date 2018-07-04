/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type State = {
  error: ?string,
  clients: Array<Client>,
};

export type Action =
  | {
      type: 'SERVER_ERROR',
      payload: ?string,
    }
  | {
      type: 'NEW_CLIENT',
      payload: Client,
    }
  | {
      type: 'CLIENT_REMOVED',
      payload: string,
    };

const INITIAL_STATE: State = {
  error: null,
  clients: [],
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Action,
): State {
  if (action.type === 'NEW_CLIENT') {
    const {payload} = action;
    return {
      ...state,
      clients: state.clients.concat(payload),
    };
  } else if (action.type === 'CLIENT_REMOVED') {
    const {payload} = action;
    return {
      ...state,
      clients: state.clients.filter((client: Client) => client.id !== payload),
    };
  } else if (action.type === 'SERVER_ERROR') {
    const {payload} = action;
    return {...state, error: payload};
  } else {
    return state;
  }
}

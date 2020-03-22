/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {produce} from 'immer';
import {remote} from 'electron';
import {Actions} from './';

export type TrackingEvent =
  | {
      type: 'WINDOW_FOCUS_CHANGE';
      time: number;
      isFocused: boolean;
    }
  | {type: 'PLUGIN_SELECTED'; time: number; plugin: string | null}
  | {type: 'TIMELINE_START'; time: number; isFocused: boolean};

export type State = {
  timeline: TrackingEvent[];
};
const INITAL_STATE: State = {
  timeline: [
    {
      type: 'TIMELINE_START',
      time: Date.now(),
      isFocused: remote.getCurrentWindow().isFocused(),
    },
  ],
};

export type Action =
  | {
      type: 'windowIsFocused';
      payload: {isFocused: boolean; time: number};
    }
  | {type: 'CLEAR_TIMELINE'; payload: {time: number; isFocused: boolean}};

export default function reducer(
  state: State = INITAL_STATE,
  action: Actions,
): State {
  if (action.type === 'CLEAR_TIMELINE') {
    return {
      ...state,
      timeline: [
        {
          type: 'TIMELINE_START',
          time: action.payload.time,
          isFocused: action.payload.isFocused,
        },
      ],
    };
  } else if (action.type === 'windowIsFocused') {
    return produce(state, draft => {
      draft.timeline.push({
        type: 'WINDOW_FOCUS_CHANGE',
        time: action.payload.time,
        isFocused: action.payload.isFocused,
      });
    });
  } else if (action.type === 'SELECT_PLUGIN') {
    return produce(state, draft => {
      draft.timeline.push({
        type: 'PLUGIN_SELECTED',
        time: action.payload.time,
        plugin: action.payload.selectedPlugin || null,
      });
    });
  }
  return state;
}

export function clearTimeline(time: number): Action {
  return {
    type: 'CLEAR_TIMELINE',
    payload: {
      time,
      isFocused: remote.getCurrentWindow().isFocused(),
    },
  };
}

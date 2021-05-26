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
import {SelectionInfo} from '../utils/info';

export type TrackingEvent =
  | {
      type: 'WINDOW_FOCUS_CHANGE';
      time: number;
      isFocused: boolean;
    }
  | {
      type: 'SELECTION_CHANGED';
      selectionKey: string | null;
      selection: SelectionInfo | null;
      time: number;
    }
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
  | {type: 'CLEAR_TIMELINE'; payload: {time: number; isFocused: boolean}}
  | {
      type: 'SELECTION_CHANGED';
      payload: {selection: SelectionInfo; time: number};
    };

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
    return produce(state, (draft) => {
      draft.timeline.push({
        type: 'WINDOW_FOCUS_CHANGE',
        time: action.payload.time,
        isFocused: action.payload.isFocused,
      });
    });
  } else if (action.type === 'SELECTION_CHANGED') {
    const {selection, time} = action.payload;
    return produce(state, (draft) => {
      draft.timeline.push({
        type: 'SELECTION_CHANGED',
        time,
        selectionKey: selection?.plugin ? JSON.stringify(selection) : null,
        selection,
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

export function selectionChanged(payload: {
  selection: SelectionInfo;
  time: number;
}): Action {
  return {
    type: 'SELECTION_CHANGED',
    payload,
  };
}

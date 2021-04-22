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
import {getPluginKey} from '../utils/pluginUtils';
import {deconstructClientId} from '../utils/clientUtils';

export type SelectedPluginData = {
  plugin: string | null;
  app: string | null;
  os: string | null;
  device: string | null;
  deviceName: string | null;
  deviceSerial: string | null;
  deviceType: string | null;
  archived: boolean | null;
};

export type TrackingEvent =
  | {
      type: 'WINDOW_FOCUS_CHANGE';
      time: number;
      isFocused: boolean;
    }
  | {
      type: 'PLUGIN_SELECTED';
      pluginKey: string | null;
      pluginData: SelectedPluginData | null;
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
    return produce(state, (draft) => {
      draft.timeline.push({
        type: 'WINDOW_FOCUS_CHANGE',
        time: action.payload.time,
        isFocused: action.payload.isFocused,
      });
    });
  } else if (action.type === 'SELECT_PLUGIN') {
    return produce(state, (draft) => {
      const selectedApp = action.payload.selectedApp;
      const clientIdParts = selectedApp
        ? deconstructClientId(selectedApp)
        : null;
      draft.timeline.push({
        type: 'PLUGIN_SELECTED',
        time: action.payload.time,
        pluginKey: action.payload.selectedPlugin
          ? getPluginKey(
              action.payload.selectedApp,
              action.payload.selectedDevice,
              action.payload.selectedPlugin,
            )
          : null,
        pluginData: {
          plugin: action.payload.selectedPlugin || null,
          app: clientIdParts?.app || null,
          device: action.payload.selectedDevice?.title || null,
          deviceName: clientIdParts?.device || null,
          deviceSerial: action.payload.selectedDevice?.serial || null,
          deviceType: action.payload.selectedDevice?.deviceType || null,
          os: action.payload.selectedDevice?.os || null,
          archived: action.payload.selectedDevice?.isArchived || false,
        },
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

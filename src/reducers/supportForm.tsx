/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
type SubmediaType =
  | {uploadID: string; status: 'Uploaded'}
  | {status: 'NotUploaded' | 'Uploading'};
type MediaObject = SubmediaType & {
  description: string;
  path: string;
};

export type Groups =
  | 'Litho Support'
  | 'GraphQL Android Support'
  | 'GraphQL iOS Support';

export type MediaType = Array<MediaObject>;
export type SupportFormV2State = {
  title: string;
  description: string;
  commitHash: string;
  screenshots?: MediaType;
  videos?: MediaType;
  selectedGroup: Groups;
};

export type SupportFormRequestDetailsState = SupportFormV2State & {
  appName: string;
};
export type State = {
  webState: NTUsersFormData | null;
  supportFormV2: SupportFormV2State;
};
export type Action =
  | {
      type: 'SET_SUPPORT_FORM_STATE';
      payload: NTUsersFormData | null;
    }
  | {
      type: 'SET_SUPPORT_FORM_V2_STATE';
      payload: SupportFormV2State;
    }
  | {
      type: 'RESET_SUPPORT_FORM_V2_STATE';
    };

export type NTUsersFormData = {
  flipper_trace: string | null;
};

export const initialState: () => State = () => ({
  webState: null,
  supportFormV2: {
    title: '',
    description: [
      '## Context',
      'What are you trying to accomplish at a high level? Feel free to include mocks and tasks.',
      '',
      '## Problem',
      "What's blocking you?",
      '',
      "## Workarounds I've Tried",
      '',
    ].join('\n'),
    commitHash: '',
    appName: '',
    selectedGroup: 'Litho Support',
  },
});
export default function reducer(
  state: State | undefined,
  action: Actions,
): State {
  state = state || initialState();
  if (action.type === 'SET_SUPPORT_FORM_STATE') {
    return {
      ...state,
      webState: action.payload,
    };
  } else if (action.type === 'SET_SUPPORT_FORM_V2_STATE') {
    return {
      ...state,
      supportFormV2: action.payload,
    };
  } else if (action.type === 'RESET_SUPPORT_FORM_V2_STATE') {
    return initialState();
  } else {
    return state;
  }
}

export const setSupportFormState = (
  payload: NTUsersFormData | null,
): Action => ({
  type: 'SET_SUPPORT_FORM_STATE',
  payload,
});

export const setSupportFormV2State = (payload: SupportFormV2State): Action => ({
  type: 'SET_SUPPORT_FORM_V2_STATE',
  payload,
});

export const resetSupportFormV2State = (): Action => ({
  type: 'RESET_SUPPORT_FORM_V2_STATE',
});

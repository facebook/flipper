/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions, Store} from './';
import {setStaticView} from './connections';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';
import {deconstructClientId} from '../utils/clientUtils';
import {starPlugin as setStarPlugin} from './connections';
import {showStatusUpdatesForDuration} from '../utils/promiseTimeout';
import {selectedPlugins as setSelectedPlugins} from './plugins';
import {getEnabledOrExportPersistedStatePlugins} from '../utils/pluginUtils';
import {addStatusMessage, removeStatusMessage} from './application';
import constants from '../fb-stubs/constants';
import {getInstance} from '../fb-stubs/Logger';
import {logPlatformSuccessRate} from '../utils/metrics';
import {getActivePersistentPlugins} from '../utils/pluginUtils';
export const SUPPORT_FORM_PREFIX = 'support-form-v2';
import {State as PluginStatesState} from './pluginStates';
import {State as PluginsState} from '../reducers/plugins';
import {State as PluginMessageQueueState} from '../reducers/pluginMessageQueue';
import Client from '../Client';
import {OS} from '../devices/BaseDevice';

const {
  GRAPHQL_IOS_SUPPORT_GROUP_ID,
  GRAPHQL_ANDROID_SUPPORT_GROUP_ID,
  LITHO_SUPPORT_GROUP_ID,
} = constants;
type SubmediaType =
  | {uploadID: string; status: 'Uploaded'}
  | {status: 'NotUploaded' | 'Uploading'};
type MediaObject = SubmediaType & {
  description: string;
  path: string;
};

export type GroupValidationErrors = {
  plugins: string | null;
  os: string | null;
};

export class Group {
  constructor(
    name: GroupNames,
    workplaceGroupID: number,
    requiredPlugins: Array<string>,
    defaultPlugins: Array<string>,
    supportedOS: Array<OS>,
  ) {
    this.name = name;
    this.requiredPlugins = requiredPlugins;
    this.defaultPlugins = defaultPlugins;
    this.workplaceGroupID = workplaceGroupID;
    this.supportedOS = supportedOS;
  }
  readonly name: GroupNames;
  requiredPlugins: Array<string>;
  defaultPlugins: Array<string>;
  workplaceGroupID: number;
  supportedOS: Array<OS>;

  getPluginsToSelect(): Array<string> {
    return Array.from(
      new Set([...this.defaultPlugins, ...this.requiredPlugins]),
    );
  }

  getValidationMessage(
    selectedPlugins: Array<string>,
    selectedOS: OS | null,
  ): GroupValidationErrors {
    const nonSelectedPlugin: Array<string> = [];
    for (const plugin of this.requiredPlugins) {
      if (!selectedPlugins.includes(plugin)) {
        nonSelectedPlugin.push(plugin);
      }
    }

    // Plugin validation
    let str: string | null =
      'should be exported if you want to submit to this group. Make sure, if your selected app supports those plugins, if so then enable it and select it from the plugin selection.';
    if (nonSelectedPlugin.length == 1) {
      str = `the ${nonSelectedPlugin.pop()} plugin ${str}`;
    } else if (nonSelectedPlugin.length > 1) {
      const lastPlugin = nonSelectedPlugin.pop();
      str = `the ${nonSelectedPlugin.join(',')} and ${lastPlugin} ${str}`;
    } else {
      // nonSelectedPlugin is empty
      str = null;
    }

    // OS validation
    let osError: string | null = null;
    if (!selectedOS) {
      osError = 'Please select an app from the drop down.';
    } else if (!this.supportedOS.includes(selectedOS)) {
      osError = `The group ${
        this.name
      } supports exports from ${this.supportedOS.join(
        ', ',
      )}. But your selected device's OS is ${selectedOS}, which is unsupported.`;
    }
    return {plugins: str, os: osError};
  }

  handleSupportFormDeeplinks(store: Store) {
    getInstance().track('usage', 'support-form-source', {
      source: 'deeplink',
      group: this.name,
    });
    store.dispatch(setStaticView(SupportRequestFormV2));
    const selectedApp = store.getState().connections.selectedApp;
    const selectedClient = store.getState().connections.clients.find(o => {
      return o.id === store.getState().connections.selectedApp;
    });
    let errorMessage: string | undefined = undefined;
    if (selectedApp) {
      const {app} = deconstructClientId(selectedApp);
      const enabledPlugins: Array<string> | null = store.getState().connections
        .userStarredPlugins[app];
      const unsupportedPlugins = [];
      for (const requiredPlugin of this.requiredPlugins) {
        const requiredPluginEnabled =
          enabledPlugins != null && enabledPlugins.includes(requiredPlugin);
        if (
          selectedClient &&
          selectedClient.plugins.includes(requiredPlugin) &&
          !requiredPluginEnabled
        ) {
          store.dispatch(
            setStarPlugin({
              selectedApp: app,
              selectedPlugin: requiredPlugin,
            }),
          );
        } else if (
          !selectedClient ||
          !selectedClient.plugins.includes(requiredPlugin)
        ) {
          unsupportedPlugins.push(requiredPlugin);
        }
      }
      if (unsupportedPlugins.length > 0) {
        errorMessage = `The current client does not support ${unsupportedPlugins.join(
          ', ',
        )}. Please change the app from the dropdown in the support form.`;
        logPlatformSuccessRate(`${SUPPORT_FORM_PREFIX}-deeplink`, {
          kind: 'failure',
          supportedOperation: true,
          error: errorMessage,
        });
        showStatusUpdatesForDuration(
          errorMessage,
          'Deeplink',
          10000,
          payload => {
            store.dispatch(addStatusMessage(payload));
          },
          payload => {
            store.dispatch(removeStatusMessage(payload));
          },
        );
      }
    } else {
      errorMessage =
        'Selected app is null, thus the deeplink failed to enable required plugin.';
      showStatusUpdatesForDuration(
        'Please select an app and the device from the dropdown.',
        'Deeplink',
        10000,
        payload => {
          store.dispatch(addStatusMessage(payload));
        },
        payload => {
          store.dispatch(removeStatusMessage(payload));
        },
      );
    }
    store.dispatch(
      setSupportFormV2State({
        ...store.getState().supportForm.supportFormV2,
        selectedGroup: this,
      }),
    );
    const pluginsList = selectedClient
      ? getEnabledOrExportPersistedStatePlugins(
          store.getState().connections.userStarredPlugins,
          selectedClient,
          store.getState().plugins,
        )
      : [];

    store.dispatch(
      setSelectedPlugins(
        this.getPluginsToSelect().filter(s => {
          return pluginsList.map(s => s.id).includes(s);
        }),
      ),
    );
    logPlatformSuccessRate(
      `${SUPPORT_FORM_PREFIX}-deeplink`,
      errorMessage
        ? {
            kind: 'failure',
            supportedOperation: true,
            error: errorMessage,
          }
        : {kind: 'success'},
    );
  }

  getWarningMessage(
    plugins: PluginsState,
    pluginsState: PluginStatesState,
    pluginsMessageQueue: PluginMessageQueueState,
    client: Client,
  ): string | null {
    const activePersistentPlugins = getActivePersistentPlugins(
      pluginsState,
      pluginsMessageQueue,
      plugins,
      client,
    );
    const emptyPlugins: Array<string> = [];
    for (const plugin of this.requiredPlugins) {
      if (
        !activePersistentPlugins.find(o => {
          return o.id === plugin;
        })
      ) {
        emptyPlugins.push(plugin);
      }
    }
    const commonStr = 'Are you sure you want to submit?';
    if (emptyPlugins.length == 1) {
      return `There is no data in ${emptyPlugins.pop()} plugin. ${commonStr}`;
    } else if (emptyPlugins.length > 1) {
      return `The following plugins have no data: ${emptyPlugins.join(
        ',',
      )}. ${commonStr}`;
    }

    return null;
  }
}

export type GroupNames =
  | 'Litho Support'
  | 'GraphQL Android Support'
  | 'GraphQL iOS Support';

export const LITHO_GROUP = new Group(
  'Litho Support',
  LITHO_SUPPORT_GROUP_ID,
  ['Inspector'],
  ['Sections', 'DeviceLogs'],
  ['Android'],
);

export const GRAPHQL_ANDROID_GROUP = new Group(
  'GraphQL Android Support',
  GRAPHQL_ANDROID_SUPPORT_GROUP_ID,
  ['GraphQL', 'Network'],
  ['DeviceLogs'],
  ['Android'],
);

export const GRAPHQL_IOS_GROUP = new Group(
  'GraphQL iOS Support',
  GRAPHQL_IOS_SUPPORT_GROUP_ID,
  ['GraphQL', 'Network'],
  ['DeviceLogs'],
  ['iOS'],
);

export const SUPPORTED_GROUPS: Array<Group> = [
  LITHO_GROUP,
  GRAPHQL_ANDROID_GROUP,
  GRAPHQL_IOS_GROUP,
];

export type MediaType = Array<MediaObject>;
export type SupportFormV2State = {
  title: string;
  description: string;
  commitHash: string;
  screenshots?: MediaType;
  videos?: MediaType;
  selectedGroup: Group;
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
    selectedGroup: LITHO_GROUP,
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

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
import {deconstructClientId} from '../utils/clientUtils';
import {starPlugin as setStarPlugin} from './pluginManager';
import {showStatusUpdatesForDuration} from '../utils/promiseTimeout';
import {selectedPlugins as setSelectedPlugins} from './plugins';
import {addStatusMessage, removeStatusMessage} from './application';
import constants from '../fb-stubs/constants';
import {getInstance} from '../fb-stubs/Logger';
import {logPlatformSuccessRate} from '../utils/metrics';
import {getExportablePlugins} from '../utils/pluginUtils';
export const SUPPORT_FORM_PREFIX = 'support-form-v2';
import Client from '../Client';
import BaseDevice, {OS} from '../devices/BaseDevice';

const {DEFAULT_SUPPORT_GROUP} = constants;

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
    name: string,
    workplaceGroupID: number,
    requiredPlugins: Array<string>,
    defaultPlugins: Array<string>,
    supportedOS: Array<OS>,
    deeplinkSuffix: string,
    papercuts?: string,
  ) {
    this.name = name;
    this.requiredPlugins = requiredPlugins;
    this.defaultPlugins = defaultPlugins;
    this.workplaceGroupID = workplaceGroupID;
    this.supportedOS = supportedOS;
    this.deeplinkSuffix = deeplinkSuffix;
    this.papercuts = papercuts;
  }
  readonly name: string;
  requiredPlugins: Array<string>;
  defaultPlugins: Array<string>;
  workplaceGroupID: number;
  supportedOS: Array<OS>;
  deeplinkSuffix: string;
  papercuts?: string;

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
    if (this.name !== 'Flipper') {
      if (!selectedOS) {
        osError = 'Please select an app from the drop down.';
      } else if (!this.supportedOS.includes(selectedOS)) {
        osError = `The group ${
          this.name
        } supports exports from ${this.supportedOS.join(
          ', ',
        )}. But your selected device's OS is ${selectedOS}, which is unsupported.`;
      }
    }
    return {plugins: str, os: osError};
  }

  handleSupportFormDeeplinks(store: Store) {
    getInstance().track('usage', 'support-form-source', {
      source: 'deeplink',
      group: this.name,
    });
    store.dispatch(
      setStaticView(require('../fb-stubs/SupportRequestFormV2').default),
    );
    const selectedApp = store.getState().connections.selectedApp;
    const selectedClient = store.getState().connections.clients.find((o) => {
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
          const plugin =
            store.getState().plugins.clientPlugins.get(requiredPlugin) ||
            store.getState().plugins.devicePlugins.get(requiredPlugin)!;
          store.dispatch(
            setStarPlugin({
              selectedApp: app,
              plugin,
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
          (payload) => {
            store.dispatch(addStatusMessage(payload));
          },
          (payload) => {
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
        (payload) => {
          store.dispatch(addStatusMessage(payload));
        },
        (payload) => {
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
    const pluginsList = getExportablePlugins(
      store.getState(),
      store.getState().connections.selectedDevice ?? undefined,
      selectedClient,
    );

    store.dispatch(
      setSelectedPlugins(
        this.getPluginsToSelect().filter((s) => {
          return pluginsList.map((s) => s.id).includes(s);
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
    state: Parameters<typeof getExportablePlugins>[0],
    device: BaseDevice | undefined,
    client: Client,
  ): string | null {
    const activePersistentPlugins = getExportablePlugins(state, device, client);
    const emptyPlugins: Array<string> = [];
    for (const plugin of this.requiredPlugins) {
      if (
        !activePersistentPlugins.find((o) => {
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

const DEFAULT_GROUP = new Group(
  DEFAULT_SUPPORT_GROUP.name,
  DEFAULT_SUPPORT_GROUP.workplaceGroupID,
  DEFAULT_SUPPORT_GROUP.requiredPlugins,
  DEFAULT_SUPPORT_GROUP.defaultPlugins,
  DEFAULT_SUPPORT_GROUP.supportedOS,
  DEFAULT_SUPPORT_GROUP.deeplinkSuffix,
  DEFAULT_SUPPORT_GROUP.papercuts,
);

export const SUPPORTED_GROUPS: Array<Group> = [
  DEFAULT_GROUP,
  ...constants.SUPPORT_GROUPS.map(
    ({
      name,
      workplaceGroupID,
      requiredPlugins,
      defaultPlugins,
      supportedOS,
      deeplinkSuffix,
      papercuts,
    }) => {
      return new Group(
        name,
        workplaceGroupID,
        requiredPlugins,
        defaultPlugins,
        supportedOS,
        deeplinkSuffix,
        papercuts,
      );
    },
  ),
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
    selectedGroup: DEFAULT_GROUP,
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

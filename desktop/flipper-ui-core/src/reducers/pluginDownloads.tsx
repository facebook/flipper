/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DownloadablePluginDetails,
  getPluginVersionInstallationDir,
} from 'flipper-plugin-lib';
import {Actions} from '.';
import produce from 'immer';
import {Canceler} from 'axios';

export enum PluginDownloadStatus {
  QUEUED = 'Queued',
  STARTED = 'Started',
  FAILED = 'Failed',
}

export type DownloadablePluginState = {
  plugin: DownloadablePluginDetails;
  startedByUser: boolean;
} & (
  | {status: PluginDownloadStatus.QUEUED}
  | {status: PluginDownloadStatus.STARTED; cancel: Canceler}
);

// We use plugin installation path as key as it is unique for each plugin version.
export type State = Record<string, DownloadablePluginState>;

export type PluginDownloadStart = {
  type: 'PLUGIN_DOWNLOAD_START';
  payload: {
    plugin: DownloadablePluginDetails;
    startedByUser: boolean;
  };
};

export type PluginDownloadStarted = {
  type: 'PLUGIN_DOWNLOAD_STARTED';
  payload: {
    plugin: DownloadablePluginDetails;
    cancel: Canceler;
  };
};

export type PluginDownloadFinished = {
  type: 'PLUGIN_DOWNLOAD_FINISHED';
  payload: {
    plugin: DownloadablePluginDetails;
  };
};

export type Action =
  | PluginDownloadStart
  | PluginDownloadStarted
  | PluginDownloadFinished;

const INITIAL_STATE: State = {};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  switch (action.type) {
    case 'PLUGIN_DOWNLOAD_START': {
      const {plugin, startedByUser} = action.payload;
      const installationDir = getPluginVersionInstallationDir(
        plugin.name,
        plugin.version,
      );
      const downloadState = state[installationDir];
      if (downloadState) {
        // If download is already in progress - re-use the existing state.
        return produce(state, (draft) => {
          draft[installationDir] = {
            ...downloadState,
            startedByUser: startedByUser || downloadState.startedByUser,
          };
        });
      }
      return produce(state, (draft) => {
        draft[installationDir] = {
          plugin,
          startedByUser: startedByUser,
          status: PluginDownloadStatus.QUEUED,
        };
      });
    }
    case 'PLUGIN_DOWNLOAD_STARTED': {
      const {plugin, cancel} = action.payload;
      const installationDir = getPluginVersionInstallationDir(
        plugin.name,
        plugin.version,
      );
      const downloadState = state[installationDir];
      if (downloadState?.status !== PluginDownloadStatus.QUEUED) {
        console.warn(
          `Invalid state transition PLUGIN_DOWNLOAD_STARTED in status ${downloadState?.status} for download to directory ${installationDir}.`,
        );
        return state;
      }
      return produce(state, (draft) => {
        draft[installationDir] = {
          status: PluginDownloadStatus.STARTED,
          plugin,
          startedByUser: downloadState.startedByUser,
          cancel,
        };
      });
    }
    case 'PLUGIN_DOWNLOAD_FINISHED': {
      const {plugin} = action.payload;
      const installationDir = getPluginVersionInstallationDir(
        plugin.name,
        plugin.version,
      );
      return produce(state, (draft) => {
        delete draft[installationDir];
      });
    }
    default:
      return state;
  }
}

export const startPluginDownload = (payload: {
  plugin: DownloadablePluginDetails;
  startedByUser: boolean;
}): Action => ({
  type: 'PLUGIN_DOWNLOAD_START',
  payload,
});

export const pluginDownloadStarted = (payload: {
  plugin: DownloadablePluginDetails;
  cancel: Canceler;
}): Action => ({type: 'PLUGIN_DOWNLOAD_STARTED', payload});

export const pluginDownloadFinished = (payload: {
  plugin: DownloadablePluginDetails;
}): Action => ({type: 'PLUGIN_DOWNLOAD_FINISHED', payload});

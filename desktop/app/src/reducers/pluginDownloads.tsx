/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DownloadablePluginDetails} from 'flipper-plugin-lib';
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
  enableDownloadedPlugin: boolean;
} & (
  | {status: PluginDownloadStatus.QUEUED}
  | {status: PluginDownloadStatus.STARTED; cancel: Canceler}
  | {status: PluginDownloadStatus.FAILED; error: Error}
);

// We use plugin installation path as key as it is unique for each plugin version.
export type State = Record<string, DownloadablePluginState>;

export type PluginDownloadStart = {
  type: 'PLUGIN_DOWNLOAD_START';
  payload: {
    plugin: DownloadablePluginDetails;
    enableDownloadedPlugin: boolean;
  };
};

export type PluginDownloadStarted = {
  type: 'PLUGIN_DOWNLOAD_STARTED';
  payload: {
    plugin: DownloadablePluginDetails;
    cancel: Canceler;
  };
};

export type PluginDownloadSucceeded = {
  type: 'PLUGIN_DOWNLOAD_SUCCEEDED';
  payload: {
    plugin: DownloadablePluginDetails;
  };
};

export type PluginDownloadFailed = {
  type: 'PLUGIN_DOWNLOAD_FAILED';
  payload: {
    plugin: DownloadablePluginDetails;
    error: Error;
  };
};

export type Action =
  | PluginDownloadStart
  | PluginDownloadStarted
  | PluginDownloadSucceeded
  | PluginDownloadFailed;

const INITIAL_STATE: State = {};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  switch (action.type) {
    case 'PLUGIN_DOWNLOAD_START': {
      const {plugin, enableDownloadedPlugin} = action.payload;
      const downloadState = state[plugin.dir];
      if (
        downloadState && // If download is already in progress - re-use the existing state.
        downloadState.status !== PluginDownloadStatus.FAILED // Note that for failed downloads we want to retry downloads.
      ) {
        return produce(state, (draft) => {
          draft[plugin.dir] = {
            ...downloadState,
            enableDownloadedPlugin:
              enableDownloadedPlugin || downloadState.enableDownloadedPlugin,
          };
        });
      }
      return produce(state, (draft) => {
        draft[plugin.dir] = {
          plugin,
          enableDownloadedPlugin: enableDownloadedPlugin,
          status: PluginDownloadStatus.QUEUED,
        };
      });
    }
    case 'PLUGIN_DOWNLOAD_STARTED': {
      const {plugin, cancel} = action.payload;
      const downloadState = state[plugin.dir];
      if (downloadState?.status !== PluginDownloadStatus.QUEUED) {
        console.warn(
          `Invalid state transition PLUGIN_DOWNLOAD_STARTED in status ${downloadState?.status} for download to directory ${plugin.dir}.`,
        );
        return state;
      }
      return produce(state, (draft) => {
        draft[plugin.dir] = {
          status: PluginDownloadStatus.STARTED,
          plugin,
          enableDownloadedPlugin: downloadState.enableDownloadedPlugin,
          cancel,
        };
      });
    }
    case 'PLUGIN_DOWNLOAD_FAILED': {
      const {plugin, error} = action.payload;
      const downloadState = state[plugin.dir];
      if (!downloadState) {
        console.warn(
          `Invalid state transition PLUGIN_DOWNLOAD_FAILED when there is no download in progress to directory ${plugin.dir}`,
        );
      }
      return produce(state, (draft) => {
        draft[plugin.dir] = {
          status: PluginDownloadStatus.FAILED,
          plugin: downloadState.plugin,
          enableDownloadedPlugin: downloadState.enableDownloadedPlugin,
          error,
        };
      });
    }
    case 'PLUGIN_DOWNLOAD_SUCCEEDED': {
      const {plugin} = action.payload;
      return produce(state, (draft) => {
        delete draft[plugin.dir];
      });
    }
    default:
      return state;
  }
}

export const startPluginDownload = (payload: {
  plugin: DownloadablePluginDetails;
  enableDownloadedPlugin: boolean;
}): Action => ({
  type: 'PLUGIN_DOWNLOAD_START',
  payload,
});

export const pluginDownloadStarted = (payload: {
  plugin: DownloadablePluginDetails;
  cancel: Canceler;
}): Action => ({type: 'PLUGIN_DOWNLOAD_STARTED', payload});

export const pluginDownloadSucceeded = (payload: {
  plugin: DownloadablePluginDetails;
}): Action => ({type: 'PLUGIN_DOWNLOAD_SUCCEEDED', payload});

export const pluginDownloadFailed = (payload: {
  plugin: DownloadablePluginDetails;
  error: Error;
}): Action => ({type: 'PLUGIN_DOWNLOAD_FAILED', payload});

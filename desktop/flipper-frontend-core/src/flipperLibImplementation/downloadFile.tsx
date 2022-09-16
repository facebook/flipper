/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {assertNever, DownloadFileUpdate} from 'flipper-common';
import {FlipperLib, DownloadFileResponse} from 'flipper-plugin-core';
import {RenderHost} from '../RenderHost';

export const downloadFileFactory =
  (renderHost: RenderHost): FlipperLib['remoteServerContext']['downloadFile'] =>
  async (url, dest, {onProgressUpdate, ...options} = {}) => {
    const downloadDescriptor = (await renderHost.flipperServer.exec(
      'download-file-start',
      url,
      dest,
      options,
      // Casting to DownloadFileResponse to add `completed` field to `downloadDescriptor`.
    )) as DownloadFileResponse;

    let onProgressUpdateWrapped: (progressUpdate: DownloadFileUpdate) => void;
    const completed = new Promise<number>((resolve, reject) => {
      onProgressUpdateWrapped = (progressUpdate: DownloadFileUpdate) => {
        if (progressUpdate.id === downloadDescriptor.id) {
          const {status} = progressUpdate;
          switch (status) {
            case 'downloading': {
              onProgressUpdate?.(progressUpdate);
              break;
            }
            case 'success': {
              resolve(progressUpdate.downloaded);
              break;
            }
            case 'error': {
              reject(
                new Error(
                  `File download failed. Last message: ${JSON.stringify(
                    progressUpdate,
                  )}`,
                ),
              );
              break;
            }
            default: {
              assertNever(status);
            }
          }
        }
      };
      renderHost.flipperServer.on(
        'download-file-update',
        onProgressUpdateWrapped,
      );
    });

    // eslint-disable-next-line promise/catch-or-return
    completed.finally(() => {
      renderHost.flipperServer.off(
        'download-file-update',
        onProgressUpdateWrapped,
      );
    });

    downloadDescriptor.completed = completed;

    return downloadDescriptor;
  };

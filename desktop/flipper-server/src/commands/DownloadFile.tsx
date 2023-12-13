/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServerCommands, FlipperServerEvents, uuid} from 'flipper-common';
import {pathExists} from 'fs-extra';
import {promises, createWriteStream, ReadStream} from 'fs';
import axios from 'axios';
import http from 'http';
import https from 'https';

const {unlink} = promises;

// Adapter which forces node.js implementation for axios instead of browser implementation
// Node.js implementation is better, because it
// supports streams which can be used for direct downloading to disk.
const axiosHttpAdapter = require('axios/lib/adapters/http'); // eslint-disable-line import/no-commonjs

export const commandDownloadFileStartFactory =
  (
    emit: (
      event: 'download-file-update',
      payload: FlipperServerEvents['download-file-update'],
    ) => void,
  ): FlipperServerCommands['download-file-start'] =>
  async (
    url,
    dest,
    {method = 'GET', timeout, maxRedirects, headers, overwrite} = {},
  ) => {
    const destExists = await pathExists(dest);

    if (destExists) {
      if (!overwrite) {
        throw new Error(
          'FlipperServerImpl -> executing "download-file" -> path already exists and overwrite set to false',
        );
      }

      await unlink(dest);
    }

    console.debug('commandDownloadFileStartFactory -> start', {
      http: {
        usedSockets: Object.keys(http.globalAgent.sockets).length,
        freeSocket: Object.keys(http.globalAgent.freeSockets).length,
        maxSockets: http.globalAgent.maxSockets,
        maxTotalSockets: http.globalAgent.maxTotalSockets,
      },
      https: {
        usedSockets: Object.keys(https.globalAgent.sockets).length,
        freeSocket: Object.keys(https.globalAgent.freeSockets).length,
        maxSockets: https.globalAgent.maxSockets,
        maxTotalSockets: https.globalAgent.maxTotalSockets,
      },
    });

    const downloadId = uuid();

    const response = await axios.request<ReadStream>({
      method,
      url,
      responseType: 'stream',
      adapter: axiosHttpAdapter,
      timeout,
      maxRedirects,
      headers,
    });
    let totalSize = parseInt(response.headers['content-length'], 10);
    if (Number.isNaN(totalSize)) {
      totalSize = 0;
    }

    const writeStream = response.data.pipe(
      createWriteStream(dest, {autoClose: true}),
    );
    let downloaded = 0;
    response.data.on('data', (data: any) => {
      downloaded += Buffer.byteLength(data);
      emit('download-file-update', {
        id: downloadId,
        downloaded,
        totalSize,
        status: 'downloading',
      });
    });

    response.data.on('error', (e: Error) => {
      writeStream.destroy(e);
    });

    writeStream.on('finish', () => {
      emit('download-file-update', {
        id: downloadId,
        downloaded,
        totalSize,
        status: 'success',
      });
      console.debug('commandDownloadFileStartFactory -> finish', {
        http: {
          usedSockets: Object.keys(http.globalAgent.sockets).length,
          freeSocket: Object.keys(http.globalAgent.freeSockets).length,
        },
        https: {
          usedSockets: Object.keys(https.globalAgent.sockets).length,
          freeSocket: Object.keys(https.globalAgent.freeSockets).length,
        },
      });
    });

    writeStream.on('error', (e: Error) => {
      response.data.destroy();
      emit('download-file-update', {
        id: downloadId,
        downloaded,
        totalSize,
        status: 'error',
        message: e.message,
        stack: e.stack,
      });
      console.debug('commandDownloadFileStartFactory -> error', {
        http: {
          usedSockets: Object.keys(http.globalAgent.sockets).length,
          freeSocket: Object.keys(http.globalAgent.freeSockets).length,
        },
        https: {
          usedSockets: Object.keys(https.globalAgent.sockets).length,
          freeSocket: Object.keys(https.globalAgent.freeSockets).length,
        },
      });
    });

    return {
      id: downloadId,
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
      totalSize,
    };
  };

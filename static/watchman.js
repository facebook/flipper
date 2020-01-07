/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const watchman = require('fb-watchman');
const uuid = require('uuid');
const path = require('path');

module.exports = class Watchman {
  constructor(rootDir) {
    this.rootDir = rootDir;
  }

  initialize() {
    if (this.client) {
      return;
    }
    this.client = new watchman.Client();
    this.client.setMaxListeners(250);
    return new Promise((resolve, reject) => {
      const onError = err => {
        this.client.removeAllListeners('error');
        reject(err);
        this.client.end();
        delete this.client;
      };
      this.client.once('error', onError);
      this.client.capabilityCheck(
        {optional: [], required: ['relative_root']},
        error => {
          if (error) {
            onError(error);
            return;
          }
          this.client.command(
            ['watch-project', this.rootDir],
            (error, resp) => {
              if (error) {
                onError(error);
                return;
              }
              if ('warning' in resp) {
                console.warn(resp.warning);
              }
              this.watch = resp.watch;
              this.relativeRoot = resp.relative_path;
              resolve();
            },
          );
        },
      );
    });
  }

  async startWatchFiles(relativeDir, handler, options) {
    if (!this.watch) {
      throw new Error(
        'Watchman is not initialized, please call "initialize" function and wait for the returned promise completion before calling "startWatchFiles".',
      );
    }
    options = Object.assign({excludes: []}, options);
    return new Promise((resolve, reject) => {
      this.client.command(['clock', this.watch], (error, resp) => {
        if (error) {
          return reject(error);
        }

        const {clock} = resp;

        const sub = {
          expression: [
            'allof',
            ['not', ['type', 'd']],
            ...options.excludes.map(e => ['not', ['match', e, 'wholename']]),
          ],
          fields: ['name'],
          since: clock,
          relative_root: this.relativeRoot
            ? path.join(this.relativeRoot, relativeDir)
            : relativeDir,
        };

        const id = uuid.v4();

        this.client.command(
          ['subscribe', this.watch, id, sub],
          (error, resp) => {
            if (error) {
              return reject(error);
            }
            this.client.on('subscription', resp => {
              if (resp.subscription !== id || !resp.files) {
                return;
              }
              handler(resp);
            });
            resolve();
          },
        );
      });
    });
  }
};

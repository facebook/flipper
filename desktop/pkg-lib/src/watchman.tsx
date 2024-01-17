/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Client} from 'fb-watchman';
import {uuid} from 'flipper-common';
import path from 'path';

const watchmanTimeout = 60 * 1000;

export default class Watchman {
  constructor(private rootDir: string) {}

  private client?: Client;
  private watch?: any;
  private relativeRoot?: string;

  async initialize(): Promise<void> {
    if (this.client) {
      return;
    }
    this.client = new Client();
    this.client.setMaxListeners(250);
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.client!.removeAllListeners('error');
        reject(err);
        // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.client!.end();
        delete this.client;
      };

      const timeouthandle = setTimeout(() => {
        onError(new Error('Timeout when trying to start Watchman'));
      }, watchmanTimeout);

      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.client!.once('error', onError);
      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.client!.capabilityCheck(
        {optional: [], required: ['relative_root']},
        (error) => {
          if (error) {
            onError(error);
            return;
          }
          // TODO: Fix this the next time the file is edited.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.client!.command(
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
              clearTimeout(timeouthandle);
              resolve();
            },
          );
        },
      );
    });
  }

  async startWatchFiles(
    relativeDir: string,
    handler: (resp: any) => void,
    options: {excludes: string[]},
  ): Promise<void> {
    if (!this.watch) {
      throw new Error(
        'Watchman is not initialized, please call "initialize" function and wait for the returned promise completion before calling "startWatchFiles".',
      );
    }
    options = Object.assign({excludes: []}, options);
    return new Promise((resolve, reject) => {
      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.client!.command(['clock', this.watch], (error, resp) => {
        if (error) {
          return reject(error);
        }

        try {
          const {clock} = resp;

          const sub = {
            expression: [
              'allof',
              ['not', ['type', 'd']],
              // TODO: Fix this the next time the file is edited.
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              ...options!.excludes.map((e) => [
                'not',
                ['match', e, 'wholename'],
              ]),
            ],
            fields: ['name'],
            since: clock,
            relative_root: this.relativeRoot
              ? path.join(this.relativeRoot, relativeDir)
              : relativeDir,
          };

          const id = uuid();

          // TODO: Fix this the next time the file is edited.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.client!.command(['subscribe', this.watch, id, sub], (error) => {
            if (error) {
              return reject(error);
            }
            // TODO: Fix this the next time the file is edited.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.client!.on('subscription', (resp) => {
              if (resp.subscription !== id || !resp.files) {
                return;
              }
              handler(resp);
            });
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

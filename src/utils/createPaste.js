/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import child_process from 'child_process';
import {clipboard, shell} from 'electron';
import JSONStream from 'JSONStream';

type PasteResponse =
  | string
  | {
      createdPaste: {
        id: number,
        url: string,
      },
    };

export default function createPaste(input: string): Promise<?string> {
  return new Promise((resolve, reject) => {
    const child = child_process.spawn('pastry', ['--json']);

    let lastMessage: ?PasteResponse;

    child.stdout
      .pipe(JSONStream.parse([true]))
      .on('data', (data: PasteResponse) => {
        if (typeof data === 'string' && lastMessage === 'error') {
          new window.Notification('Failed to create paste', {
            body: data,
          });
          reject(data);
        } else if (typeof data === 'object' && data.createdPaste) {
          const {url, id} = data.createdPaste;
          clipboard.writeText(url);
          const notification = new window.Notification(`Paste P${id} created`, {
            body: 'URL copied to clipboard',
          });
          notification.onclick = () => shell.openExternal(url);
          resolve(url);
        }
        lastMessage = data;
      });

    child.stdin.write(input);
    child.stdin.end();
  });
}

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import child_process from 'child_process';
import {clipboard, shell} from 'electron';

type PasteResponse =
  | {
      id: number,
      objectName: string,
      phid: string,
      authorPHID: string,
      filePHID: string,
      title: string,
      dateCreated: number,
      language: string,
      uri: string,
      parentPHID: ?number,
      content: string,
    }
  | {
      type: 'error',
      message: string,
    };

export default function createPaste(input: string): Promise<?string> {
  return new Promise((resolve, reject) => {
    const arc = '/opt/facebook/bin/arc';
    const child = child_process.spawn(arc, [
      '--conduit-uri=https://phabricator.intern.facebook.com/api/',
      'paste',
      '--json',
    ]);

    child.stdin.write(input);
    child.stdin.end();
    let response = '';
    child.stdout.on('data', (data: Buffer) => {
      response += data.toString();
    });
    child.stdout.on('end', (data: Buffer) => {
      const result: PasteResponse = JSON.parse(response || 'null');

      if (!result) {
        new window.Notification('Failed to create paste', {
          body: `Does ${arc} exist and is executable?`,
        });
      } else if (result.type === 'error') {
        new window.Notification('Failed to create paste', {
          body: result.message != null ? result.message : '',
        });
        reject(result);
      } else {
        clipboard.writeText(result.uri);
        const notification = new window.Notification(
          `Paste ${result.objectName} created`,
          {
            body: 'URL copied to clipboard',
          },
        );
        notification.onclick = () => shell.openExternal(result.uri);
        resolve(result.uri);
      }
    });
  });
}

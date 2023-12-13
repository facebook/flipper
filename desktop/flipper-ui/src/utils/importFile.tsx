/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FileDescriptor, FileEncoding, uuid} from 'flipper-plugin';
import {Base64} from 'js-base64';

export async function importFile(options?: {
  /**
   * Default directory to start the file selection from
   */
  defaultPath?: string;
  /**
   * List of allowed file extensions
   */
  extensions?: string[];
  /**
   * Open file dialog title
   */
  title?: string;
  /**
   * File encoding
   */
  encoding?: FileEncoding;
  /**
   * Allow selection of multiple files
   */
  multi?: false;
}): Promise<FileDescriptor | undefined>;
export async function importFile(options?: {
  defaultPath?: string;
  extensions?: string[];
  title?: string;
  encoding?: FileEncoding;
  multi: true;
}): Promise<FileDescriptor[] | undefined>;
export async function importFile(options?: {
  defaultPath?: string;
  extensions?: string[];
  title?: string;
  encoding?: FileEncoding;
  multi?: boolean;
}) {
  return new Promise<FileDescriptor | FileDescriptor[] | undefined>(
    (resolve, reject) => {
      try {
        let selectionMade = false;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = uuid();
        if (options?.extensions) {
          fileInput.accept = options?.extensions.join(', ');
        }
        fileInput.multiple = options?.multi ?? false;

        fileInput.addEventListener('change', async (event) => {
          selectionMade = true;
          const target = event.target as HTMLInputElement | undefined;
          if (!target || !target.files) {
            resolve(undefined);
            return;
          }

          const files: File[] = Array.from(target.files);
          const descriptors: FileDescriptor[] = await Promise.all(
            files.map(async (file) => {
              switch (options?.encoding) {
                case 'base64': {
                  const bytes = new Uint8Array(await file.arrayBuffer());
                  const base64Content = Base64.fromUint8Array(bytes);
                  return {
                    data: base64Content,
                    name: file.name,
                    encoding: 'base64',
                  };
                }
                case 'binary':
                  return {
                    data: new Uint8Array(await file.arrayBuffer()),
                    name: file.name,
                    encoding: 'binary',
                  };
                default:
                  return {
                    data: await file.text(),
                    name: file.name,
                    encoding: 'utf-8',
                  };
              }
            }),
          );
          resolve(options?.multi ? descriptors : descriptors[0]);
        });

        window.addEventListener(
          'focus',
          () => {
            setTimeout(() => {
              if (!selectionMade) {
                resolve(undefined);
              }
            }, 300);
          },
          {once: true},
        );

        fileInput.click();
      } catch (error) {
        reject(error);
      }
    },
  );
}

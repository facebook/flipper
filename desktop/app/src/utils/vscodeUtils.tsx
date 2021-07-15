/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getFlipperLib} from 'flipper-plugin';
import {getPreferredEditorUriScheme} from '../fb-stubs/user';

let preferredEditorUriScheme: string | undefined = undefined;

export function callVSCode(plugin: string, command: string, params?: string) {
  getVSCodeUrl(plugin, command, params).then((url) =>
    getFlipperLib().openLink(url),
  );
}

export async function getVSCodeUrl(
  plugin: string,
  command: string,
  params?: string,
): Promise<string> {
  if (preferredEditorUriScheme === undefined) {
    preferredEditorUriScheme = await getPreferredEditorUriScheme();
  }
  return `${preferredEditorUriScheme}://${plugin}/${command}${
    params == null ? '' : `?${params}`
  }`;
}

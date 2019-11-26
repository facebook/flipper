/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {WebviewTag} from 'electron';

// TODO: Get rid off this function
function injectJavaScript(webview: WebviewTag, command: string): Promise<any> {
  // @ts-ignore: Typescript doesn't have type src in the currentTarget variable in the event, due to which there is a discrepancy in the event callback.
  return webview.executeJavaScript(command, false);
}

export function sendDidMountMessage(webview: WebviewTag) {
  webview.send('hostMessage', {
    type: 'onMountFlipper',
    payload: null,
  });
}

/**
 *
 * @param webview
 * @param text
 * This helper function is for appending flipper trace in the questions input text field.
 * It also updates the Flipper trace state in the form which makes it pass the validation.
 * One should use it only for the pages backed by NTUsersFormContainer.react.js
 */
export function sendFlipperTrace(webview: WebviewTag, text: string) {
  webview.send('hostMessage', {
    type: 'flipperTrace',
    payload: text,
  });
}

/**
 *
 * @param webview
 * @param data
 * This helper function is for updating a react state in NTUsersFormContainer.react.js
 */
export function updateStateInSupportForm(
  webview: WebviewTag,
  data: {[key: string]: any},
) {
  webview.send('hostMessage', {
    type: 'updateState',
    payload: data,
  });
}

/**
 *
 * @param webview
 * This helper function returns the supported apps by NTUsersFormContainer.react.js
 */
export function supportedApps(webview: WebviewTag): Promise<Array<string>> {
  // TODO: Replace this with a promisified call to the guest page
  return injectJavaScript(
    webview,
    "Array.from(document.querySelector('ul[role=radiogroup]').children).map(e => e.getAttribute('data-value'))",
  );
}

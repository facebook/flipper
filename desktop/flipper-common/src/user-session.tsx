/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * APIs need to integration with Facebook services.
 */

export type UserSessionManager = {
  internGraphPOSTAPIRequest: typeof internGraphPOSTAPIRequest;
};

let instance: UserSessionManager | undefined = undefined;

function getInstance(): UserSessionManager {
  if (!instance) {
    throw new Error('UserSessionManager not available or implemented');
  }
  return instance;
}

export function setUserSessionManagerInstance(i: UserSessionManager) {
  instance = i;
}

export async function internGraphPOSTAPIRequest(
  _endpoint: string,
  _formFields: {
    [key: string]: any;
  } = {},
  _internGraphUrl?: string,
  _timeout?: number,
): Promise<any> {
  // eslint-disable-next-line
  return getInstance().internGraphPOSTAPIRequest.apply(null, arguments as any);
}

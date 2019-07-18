/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import querystring from 'querystring';

export const parseURIParameters: string => Map<string, string> = (
  query: string,
) => {
  // get parameters from query string and store in Map
  const parameters = query
    .split('?')
    .splice(1)
    .join('');
  const parametersObj = querystring.parse(parameters);
  const parametersMap = new Map<string, string>();
  for (const key in parametersObj) {
    parametersMap.set(key, parametersObj[key]);
  }
  return parametersMap;
};

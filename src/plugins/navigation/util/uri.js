/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import querystring from 'querystring';

export const filterOptionalParameters: string => string = (uri: string) => {
  return uri.replace(/[/&]?([^&?={}\/]*=)?{\?.*?}/g, '');
};

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

export const parameterIsNumberType = (parameter: string) => {
  const regExp = /^{(#|\?#)/g;
  return regExp.test(parameter);
};

export const replaceRequiredParametersWithValues = (
  uri: string,
  values: Array<string>,
) => {
  const parameterRegExp = /{[^?]*?}/g;
  const replaceRegExp = /{[^?]*?}/;
  let newURI = uri;
  let index = 0;
  let match = parameterRegExp.exec(uri);
  while (match != null) {
    newURI = newURI.replace(replaceRegExp, values[index]);
    match = parameterRegExp.exec(uri);
    index++;
  }
  return newURI;
};

export const getRequiredParameters = (uri: string) => {
  const parameterRegExp = /{[^?]*?}/g;
  const matches: Array<string> = [];
  let match = parameterRegExp.exec(uri);
  while (match != null) {
    if (match[0]) {
      matches.push(match[0]);
    }
    match = parameterRegExp.exec(uri);
  }
  return matches;
};

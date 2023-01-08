/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const validateParameter = (value: string, parameter: string) => {
  return (
    value &&
    (parameterIsNumberType(parameter) ? !isNaN(parseInt(value, 10)) : true) &&
    (parameterIsBooleanType(parameter)
      ? value === 'true' || value === 'false'
      : true)
  );
};

export const filterOptionalParameters = (uri: string) => {
  return uri.replace(/[/&]?([^&?={}\/]*=)?{\?.*?}/g, '');
};

export const parseURIParameters = (query: string) => {
  // get parameters from query string and store in Map
  const parameters = query.split('?').splice(1).join('');
  const parametersObj = new URLSearchParams(parameters);
  const parametersMap = new Map<string, string>();
  for (const key in parametersObj) {
    parametersMap.set(key, parametersObj.get(key) as string);
  }
  return parametersMap;
};

export const parameterIsNumberType = (parameter: string) => {
  const regExp = /^{(#|\?#)/g;
  return regExp.test(parameter);
};

export const parameterIsBooleanType = (parameter: string) => {
  const regExp = /^{(!|\?!)/g;
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
  // Add = to the matching group to filter out stringified JSON parameters
  const parameterRegExp = /={[^?]*?}/g;
  const matches: Array<string> = [];
  let match = parameterRegExp.exec(uri);
  while (match != null) {
    if (match[0]) {
      // Remove = from the match
      const target = match[0].substring(1);
      try {
        // If the value could be parsed asa valid JSON, ignore it
        JSON.parse(target);
      } catch {
        matches.push(target);
      }
    }
    match = parameterRegExp.exec(uri);
  }
  return matches;
};

export const liveEdit = (uri: string, formValues: Array<string>) => {
  const parameterRegExp = /({[^?]*?})/g;
  const uriArray = uri.split(parameterRegExp);
  return uriArray.reduce((acc, uriComponent, idx) => {
    if (idx % 2 === 0 || !formValues[(idx - 1) / 2]) {
      return acc + uriComponent;
    } else {
      return acc + formValues[(idx - 1) / 2];
    }
  });
};

export const stripQueryParameters = (uri: string) => {
  return uri.replace(/\?.*$/g, '');
};

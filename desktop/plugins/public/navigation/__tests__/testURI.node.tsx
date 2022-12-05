/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  getRequiredParameters,
  parameterIsNumberType,
  replaceRequiredParametersWithValues,
  filterOptionalParameters,
} from '../util/uri';

test('parse required parameters from uri', () => {
  const testURI =
    'fb://test_uri/?parameter1={parameter1}&parameter2={parameter2}';
  const expectedResult = ['{parameter1}', '{parameter2}'];
  expect(getRequiredParameters(testURI)).toEqual(expectedResult);
});

test('parse required numeric parameters from uri', () => {
  const testURI =
    'fb://test_uri/?parameter1={#parameter1}&parameter2={#parameter2}';
  const expectedResult = ['{#parameter1}', '{#parameter2}'];
  expect(getRequiredParameters(testURI)).toEqual(expectedResult);
});

// https://fb.workplace.com/groups/flippersupport/permalink/1513232162490770/
test('ignore params with JSON values', () => {
  const testURI =
    'fb://test_uri/?parameter1={"test":"value"}&parameter2="{\\"test\\":\\"value\\"}"';
  const expectedResult: string[] = [];
  expect(getRequiredParameters(testURI)).toEqual(expectedResult);
});

test('replace required parameters with values', () => {
  const testURI =
    'fb://test_uri/?parameter1={parameter1}&parameter2={parameter2}';
  const expectedResult = 'fb://test_uri/?parameter1=okay&parameter2=sure';
  expect(
    replaceRequiredParametersWithValues(testURI, ['okay', 'sure']),
  ).toEqual(expectedResult);
});

test('skip non-required parameters in replacement', () => {
  const testURI =
    'fb://test_uri/?parameter1={parameter1}&parameter2={?parameter2}&parameter3={parameter3}';
  const expectedResult =
    'fb://test_uri/?parameter1=okay&parameter2={?parameter2}&parameter3=sure';
  expect(
    replaceRequiredParametersWithValues(testURI, ['okay', 'sure']),
  ).toEqual(expectedResult);
});

test('detect if required parameter is numeric type', () => {
  expect(parameterIsNumberType('{#numerictype}')).toBe(true);
});

test('detect if required parameter is not numeric type', () => {
  expect(parameterIsNumberType('{numerictype}')).toBe(false);
});

test('filter optional parameters from uri', () => {
  const testURI =
    'fb://test_uri/{?param_here}/?parameter1={parameter1}&parameter2={?parameter2}&numericParameter={#numericParameter}&parameter3={?parameter3}';
  const expextedResult =
    'fb://test_uri/?parameter1={parameter1}&numericParameter={#numericParameter}';
  expect(filterOptionalParameters(testURI)).toBe(expextedResult);
});

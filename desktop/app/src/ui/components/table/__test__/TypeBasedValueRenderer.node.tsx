/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {render} from '@testing-library/react';

import {
  Value,
  valueToNullableString,
  renderValue,
} from '../TypeBasedValueRenderer';

test('valueToNullableString', () => {
  const testcases: Array<{input: Value; output: string | null}> = [
    {
      input: {type: 'string', value: 'this is a string'},
      output: 'this is a string',
    },
    {input: {type: 'boolean', value: true}, output: 'true'},
    {input: {type: 'boolean', value: false}, output: 'false'},
    {input: {type: 'integer', value: 1337}, output: '1337'},
    {input: {type: 'float', value: 13.37}, output: '13.37'},
    {input: {type: 'null', value: null}, output: null},
  ];

  for (const testcase of testcases) {
    expect(valueToNullableString(testcase.input)).toEqual(testcase.output);
  }
});

test('renderValue', () => {
  const testcases: Array<{input: Value; queryString: string}> = [
    {
      input: {type: 'string', value: 'this is a string'},
      queryString: 'this is a string',
    },
    {input: {type: 'boolean', value: true}, queryString: 'true'},
    {input: {type: 'boolean', value: false}, queryString: 'false'},
    {input: {type: 'integer', value: 1337}, queryString: '1337'},
    {input: {type: 'float', value: 13.37}, queryString: '13.37'},
    {input: {type: 'null', value: null}, queryString: 'NULL'},
  ];
  const res = render(renderValue(testcases[0].input));
  for (const testcase of testcases) {
    res.rerender(renderValue(testcase.input));
    expect(res.queryAllByText(testcase.queryString).length).toBeGreaterThan(0);
  }
});

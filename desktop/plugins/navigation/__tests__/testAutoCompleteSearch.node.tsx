/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {filterMatchPatterns} from '../util/autoCompleteProvider';

import {URI} from '../types';

// choose all k length combinations from array
const stringCombination = (patterns: Array<string>, k: number) => {
  const n = patterns.length;
  const returnArr: Array<string> = new Array(0);
  const args = new Array(k).fill(0).map((_, idx) => idx);
  (function build(args) {
    const pattern = args.map((i) => patterns[i]).join('');
    returnArr.push(pattern);
    if (args[args.length - 1] < n - 1) {
      for (let i = args.length - 1; i >= 0; i--) {
        const newArgs = args.map((value, idx) =>
          idx >= i ? value + 1 : value,
        );
        build(newArgs);
      }
    }
  })(args);
  return returnArr;
};

// Create a map of 364 pairs
const constructMatchPatterns: () => Map<string, URI> = () => {
  const matchPatterns = new Map<string, URI>();

  const NUM_PATERNS_PER_ENTRY = 3;

  const patterns = [
    'abcdefghijklmnopqrstuvwxy',
    'ababababababababababababa',
    'cdcdcdcdcdcdcdcdcdcdcdcdc',
    'efefefefefefefefefefefefe',
    'ghghghghghghghghghghghghg',
    'ijijijijijijijijijijijiji',
    'klklklklklklklklklklklklk',
    'mnmnmnmnmnmnmnmnmnmnmnmnm',
    'opopopopopopopopopopopopo',
    'qrqrqrqrqrqrqrqrqrqrqrqrq',
    'ststststststststststststs',
    'uvuvuvuvuvuvuvuvuvuvuvuvu',
    'wxwxwxwxwxwxwxwxwxwxwxwxw',
    'yzyzyzyzyzyzyzyzyzyzyzyzy',
  ];

  stringCombination(patterns, NUM_PATERNS_PER_ENTRY).forEach((pattern) =>
    matchPatterns.set(pattern, pattern),
  );

  return matchPatterns;
};

test('construct match patterns', () => {
  const matchPatterns = constructMatchPatterns();
  expect(matchPatterns.size).toBe(364);
});

test('search for abcdefghijklmnopqrstuvwxy in matchPatterns', () => {
  const matchPatterns = constructMatchPatterns();
  const filteredMatchPatterns = filterMatchPatterns(
    matchPatterns,
    'abcdefghijklmnopqrstuvwxy',
    Infinity,
  );
  // Fixing abcdefghijklmnopqrstuvwxy, we have 13C2 = 78 patterns that will match
  expect(filteredMatchPatterns.size).toBe(78);
});

test('search for ????? in matchPatterns', () => {
  const matchPatterns = constructMatchPatterns();
  const filteredMatchPatterns = filterMatchPatterns(
    matchPatterns,
    '?????',
    Infinity,
  );
  // ????? Does not exist in our seach so should return 0
  expect(filteredMatchPatterns.size).toBe(0);
});

test('search for abcdefghijklmnopqrstuvwxyababababababababababababacdcdcdcdcdcdcdcdcdcdcdcdc in matchPatterns', () => {
  const matchPatterns = constructMatchPatterns();
  const filteredMatchPatterns = filterMatchPatterns(
    matchPatterns,
    'abcdefghijklmnopqrstuvwxyababababababababababababacdcdcdcdcdcdcdcdcdcdcdcdc',
    Infinity,
  );
  // Should only appear once in our patterns
  expect(filteredMatchPatterns.size).toBe(1);
});

test('find first five occurences of abcdefghijklmnopqrstuvwxy', () => {
  const matchPatterns = constructMatchPatterns();
  const filteredMatchPatterns = filterMatchPatterns(
    matchPatterns,
    'abcdefghijklmnopqrstuvwxy',
    5,
  );
  expect(filteredMatchPatterns.size).toBe(5);
});

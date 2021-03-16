/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  computeAddRangeToSelection,
  computeSetSelection,
} from '../DataTableManager';

test('computeSetSelection', () => {
  const emptyBase = {
    current: -1,
    items: new Set<number>(),
  };

  const partialBase = {
    current: 7,
    items: new Set([2, 3, 8, 9]),
  };

  // set selection
  expect(computeSetSelection(emptyBase, 2)).toEqual({
    current: 2,
    items: new Set([2]),
  });

  // move selection 2 down
  expect(computeSetSelection(partialBase, (x) => x + 2)).toEqual({
    current: 9,
    items: new Set([9]),
  });

  // expand selection
  expect(computeSetSelection(partialBase, (x) => x + 5, true)).toEqual({
    current: 12,
    items: new Set([2, 3, 7, 8, 9, 10, 11, 12]),
  });

  // expand selection backward
  expect(computeSetSelection(partialBase, 5, true)).toEqual({
    current: 5,
    items: new Set([2, 3, 8, 9, 5, 6, 7]), // n.b. order is irrelevant
  });

  // single item existing selection
  expect(
    computeSetSelection(
      {
        current: 4,
        items: new Set([4]),
      },
      5,
    ),
  ).toEqual({
    current: 5,
    items: new Set([5]),
  });

  // single item existing selection, toggle item off
  expect(
    computeSetSelection(
      {
        current: 4,
        items: new Set([4]),
      },
      4,
    ),
  ).toEqual({
    current: -1,
    items: new Set(),
  });
});

test('computeAddRangeToSelection', () => {
  const emptyBase = {
    current: -1,
    items: new Set<number>(),
  };

  const partialBase = {
    current: 7,
    items: new Set([2, 3, 8, 9]),
  };

  // add range selection
  expect(computeAddRangeToSelection(emptyBase, 23, 25)).toEqual({
    current: 25,
    items: new Set([23, 24, 25]),
  });

  // add range selection
  expect(computeAddRangeToSelection(partialBase, 23, 25)).toEqual({
    current: 25,
    items: new Set([2, 3, 8, 9, 23, 24, 25]),
  });

  // add range backward
  expect(computeAddRangeToSelection(partialBase, 25, 23)).toEqual({
    current: 23,
    items: new Set([2, 3, 8, 9, 23, 24, 25]),
  });

  // invest selection - toggle off
  expect(computeAddRangeToSelection(partialBase, 8, 8, true)).toEqual({
    current: 9, // select the next thing
    items: new Set([2, 3, 9]),
  });

  // invest selection - toggle on
  expect(computeAddRangeToSelection(partialBase, 5, 5, true)).toEqual({
    current: 5,
    items: new Set([2, 3, 5, 8, 9]),
  });
});

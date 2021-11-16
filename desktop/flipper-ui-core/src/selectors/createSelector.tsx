/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {shallowEqual} from 'react-redux';
import {createSelectorCreator, defaultMemoize} from 'reselect';

export const createSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual,
);

export default createSelector;

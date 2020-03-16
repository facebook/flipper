/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {statusBarView} from '../StatusBar';

test('statusBarView returns null for empty status messages', () => {
  const view = statusBarView({statusMessage: null});
  expect(view).toBeNull();
});

test('statusBarView returns non null view when the list of messages is non empty', () => {
  const view = statusBarView({statusMessage: 'Last Message'});
  expect(view).toBeDefined();
});

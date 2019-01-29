/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {RecurringError} from '../errors';

test('Check RecurringError toString output', () => {
  const error = new RecurringError('something');
  expect(error.toString()).toBe('[RecurringError] something');
  /* $FlowFixMe intentionally coercing it to a string to make sure the correct
   method is overridden */
  expect('' + error).toBe('[RecurringError] something');
});

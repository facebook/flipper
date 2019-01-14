/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {recordSuccessMetric} from '../metrics';
import type Logger from '../../fb-stubs/Logger';

//$FlowFixMe pretend logger is the right type
const logger: Logger = {
  track: jest.fn(),
};

beforeAll(() => {
  logger.track.mockClear();
});

test('Wrapping a successful promise preserves result and logs correctly', () => {
  const successPromise = Promise.resolve('Yay!');
  const wrappedPromise = recordSuccessMetric(
    successPromise,
    'test metric',
    logger,
  );
  return wrappedPromise
    .then(wrappedValue => {
      expect(wrappedValue).toBe('Yay!');
    })
    .then(() => {
      expect(logger.track).toHaveBeenCalledWith(
        'success-rate',
        'test metric',
        1,
      );
    });
});

test('Wrapping a rejected promise preserves result and logs correctly', () => {
  const successPromise = Promise.reject('Oh no!');
  const wrappedPromise = recordSuccessMetric(
    successPromise,
    'test metric',
    logger,
  );
  expect.assertions(2); // Make sure to fail if catch block isn't visited
  return wrappedPromise
    .catch(wrappedValue => {
      expect(wrappedValue).toBe('Oh no!');
    })
    .then(() => {
      expect(logger.track).toHaveBeenCalledWith(
        'success-rate',
        'test metric',
        0,
      );
    });
});

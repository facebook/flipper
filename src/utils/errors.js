/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// Class of errors that may keep repeating but should only be logged once.
export class RecurringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecurringError';
  }
}

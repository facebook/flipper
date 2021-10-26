/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  preset: "ts-jest",
  clearMocks: true,
  coverageReporters: ['json-summary', 'lcov', 'html'],
  testMatch: ['**/**.spec.(js|jsx|ts|tsx)'],
};

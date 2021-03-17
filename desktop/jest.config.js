/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  transform: {
    '^.*__tests__(/|\\\\).*\\.tsx?$': 'ts-jest',
    '\\.(js|tsx?)$': '<rootDir>/scripts/jest-transform.js',
  },
  setupFiles: ['<rootDir>/scripts/jest-setup.js'],
  moduleNameMapper: {
    '^flipper$': '<rootDir>/app/src',
    '^flipper-plugin$': '<rootDir>/flipper-plugin/src',
    '^flipper-(pkg|pkg-lib|doctor|test-utils)$': '<rootDir>/$1/src',
  },
  clearMocks: true,
  coverageReporters: ['json-summary', 'lcov', 'html'],
  testMatch: ['**/**.(node|spec).(js|jsx|ts|tsx)'],
  testEnvironment: 'jest-environment-jsdom-sixteen',
};

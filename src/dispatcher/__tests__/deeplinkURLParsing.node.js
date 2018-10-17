/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {uriComponents} from '../application.js';

test('test parsing of deeplink URL', () => {
  const url = 'flipper://app/plugin/meta/data';
  let components = uriComponents(url);
  expect(components).toEqual(['app', 'plugin', 'meta/data']);
});

test('test parsing of deeplink URL when arguments are less', () => {
  const url = 'flipper://app/';
  let components = uriComponents(url);
  expect(components).toEqual(['app']);
});

test('test parsing of deeplink URL when url is null', () => {
  // $FlowFixMe
  let components = uriComponents(null);
  expect(components).toEqual([]);
});

test('test parsing of deeplink URL when pattern does not match', () => {
  const url = 'Some random string';
  let components = uriComponents(url);
  expect(components).toEqual([]);
});

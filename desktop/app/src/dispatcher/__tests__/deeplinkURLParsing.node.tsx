/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {uriComponents} from '../application';

test('test parsing of deeplink URL', () => {
  const url = 'flipper://app/plugin/meta/data';
  const components = uriComponents(url);
  expect(components).toEqual(['app', 'plugin', 'meta/data']);
});

test('test parsing of deeplink URL when arguments are less', () => {
  const url = 'flipper://app/';
  const components = uriComponents(url);
  expect(components).toEqual(['app']);
});

test('test parsing of deeplink URL when url is null', () => {
  // @ts-ignore
  const components = uriComponents(null);
  expect(components).toEqual([]);
});

test('test parsing of deeplink URL when pattern does not match', () => {
  const url = 'Some random string';
  const components = uriComponents(url);
  expect(components).toEqual([]);
});

test('test parsing of deeplinkURL when there are query params', () => {
  const url = 'flipper://null/React/?device=React%20Native';
  const components = uriComponents(url);
  expect(components).toEqual(['null', 'React', '?device=React Native']);
});

test('test parsing of deeplinkURL when there are query params without slash', () => {
  const url = 'flipper://null/React?device=React%20Native';
  const components = uriComponents(url);
  expect(components).toEqual(['null', 'React', '?device=React Native']);
});

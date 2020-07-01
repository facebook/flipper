/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';

import {FlipperClient} from 'flipper-plugin';

type Events = {
  inc: {delta: number};
};

export function plugin(_client: FlipperClient<Events, {}>) {
  return {};
}

export function Component() {
  return <h1>Sandy high fives Flipper</h1>;
}

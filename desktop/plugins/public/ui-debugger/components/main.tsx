/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {plugin} from '../index';
import {usePlugin, useValue} from 'flipper-plugin';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);

  return <div>{rootId}</div>;
}

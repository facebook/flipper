/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';

import {UINode} from '../../types';

export async function prefetchSourceFileLocation(_: UINode) {}

export function IDEContextMenuItems(_: {node: UINode}) {
  return <></>;
}

export function BigGrepContextMenuItems(_: {node: UINode}) {
  return <></>;
}

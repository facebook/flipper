/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';

import {ClientNode} from '../../ClientTypes';

export async function prefetchSourceFileLocation(_: ClientNode) {}

export function IDEContextMenuItems(_: {node: ClientNode}) {
  return <></>;
}

export function BigGrepContextMenuItems(_: {node: ClientNode}) {
  return <></>;
}

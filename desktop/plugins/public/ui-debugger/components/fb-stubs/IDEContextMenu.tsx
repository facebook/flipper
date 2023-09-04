/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {MenuProps} from 'antd';

import {ClientNode} from '../../ClientTypes';

export async function prefetchSourceFileLocation(_: ClientNode) {}

type MenuItems = MenuProps['items'];

export function ideContextMenuItems(
  _node: ClientNode,
  _onResultsUpdated: () => void,
): MenuItems {
  return [];
}

export function bigGrepContextMenuItems(_: ClientNode): MenuItems {
  return [];
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {UINode} from '../../../types';

type Props = {
  node: UINode;
};

export const LayoutInspector: React.FC<Props> = () => {
  return <p>Origin and size</p>;
};

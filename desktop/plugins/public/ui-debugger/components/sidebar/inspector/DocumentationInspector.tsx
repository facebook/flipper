/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {UINode} from '../../../ClientTypes';

type Props = {
  node: UINode;
};

export const DocumentationInspector: React.FC<Props> = () => {
  return <p>Quick Help and Documentation</p>;
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Tag} from '../../../../types';

type CodeInspectorProps = {
  tags: Tag[];
  qualifiedName: string;
  lineNumber?: number;
  androidId?: string;
};
export const CodeInspector: React.FC<CodeInspectorProps> = () => {
  return <></>;
};

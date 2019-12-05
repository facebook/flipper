/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import Label from './Label';
import VBox from './VBox';
import FlexColumn from './FlexColumn';

/**
 * Vertically arranged section that starts with a label and includes standard margins
 */
const Labeled: React.FC<{title: string | React.ReactNode}> = ({
  title,
  children,
}) => (
  <VBox>
    <Label style={{marginBottom: 6}}>{title}</Label>
    <FlexColumn>{children}</FlexColumn>
  </VBox>
);

export default Labeled;

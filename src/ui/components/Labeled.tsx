/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import FlexColumn from './FlexColumn';
import Label from './Label';
import VBox from './VBox';

/**
 * Vertically arranged section that starts with a label and includes standard margins
 */
const Labeled: React.FC<{title: string}> = ({title, children}) => (
  <FlexColumn>
    <Label style={{marginBottom: 6}}>{title}</Label>
    <VBox>{children}</VBox>
  </FlexColumn>
);

export default Labeled;

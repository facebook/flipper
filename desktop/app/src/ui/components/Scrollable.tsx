/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import styled from '@emotion/styled';

const Scrollable: React.FC<{children: React.ReactNode}> = styled('div')({
  width: '100%',
  height: '100%',
  overflow: 'auto',
});
Scrollable.displayName = 'Scrollable';

export default Scrollable;

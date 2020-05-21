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
import {BackgroundProperty} from 'csstype';

type Props = {children: React.ReactNode; background?: BackgroundProperty<any>};

const Scrollable: React.FC<Props> = styled('div')<Props>(({background}) => ({
  width: '100%',
  height: '100%',
  overflow: 'auto',
  background,
}));
Scrollable.displayName = 'Scrollable';

export default Scrollable;

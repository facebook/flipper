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
import {Property} from 'csstype';

type Props = {children: React.ReactNode; background?: Property.Background<any>};

/**
 * @deprecated use Layout.ScrollContainer from 'flipper-plugin'
 */
const Scrollable = styled.div<Props>(({background}) => ({
  width: '100%',
  height: '100%',
  overflow: 'auto',
  background,
}));
Scrollable.displayName = 'Scrollable';

export default Scrollable;

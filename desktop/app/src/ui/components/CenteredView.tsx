/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Layout, theme} from 'flipper-plugin';

/**
 * CenteredView creates a scrollable container with fixed with, centered content.
 * Recommended to combine with RoundedSection
 * @deprecated
 */
const CenteredView: React.FC<{}> = ({children}) => (
  <Layout.ScrollContainer style={{background: theme.backgroundWash}}>
    <Layout.Container
      center
      padv={theme.space.huge}
      width={500}
      style={{
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
      {children}
    </Layout.Container>
  </Layout.ScrollContainer>
);

export default CenteredView;

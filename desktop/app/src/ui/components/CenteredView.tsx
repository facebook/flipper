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
import {colors} from './colors';
import FlexColumn from './FlexColumn';

const Container = styled(FlexColumn)({
  height: '100%',
  overflow: 'auto',
  backgroundColor: colors.light02,
});
Container.displayName = 'CenteredView:Container';

const ContentWrapper = styled.div({
  width: 500,
  marginLeft: 'auto',
  marginRight: 'auto',
  padding: '20px 0',
});
ContentWrapper.displayName = 'CenteredView:ContentWrapper';

/**
 * CenteredView creates a scrollable container with fixed with, centered content.
 * Recommended to combine with RoundedSection
 * @deprecated
 */
const CenteredView: React.FC<{}> = ({children}) => (
  <Container grow>
    <ContentWrapper>{children}</ContentWrapper>
  </Container>
);

export default CenteredView;

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
import Heading from './Heading';
import FlexColumn from './FlexColumn';

const Divider = styled.hr({
  margin: '16px -20px 20px -20px',
  border: 'none',
  borderTop: `1px solid ${colors.light05}`,
});
Divider.displayName = 'RoundedSection:Divider';

const Container = styled.div({
  background: colors.white,
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  marginBottom: '20px',
  width: '100%',
  padding: 20,
});
Container.displayName = 'RoundedSection:Container';

/**
 * Section with a title, dropshadow, rounded border and white backgorund.
 *
 * Recommended to be used inside a CenteredView
 */
const RoundedSection: React.FC<{title: string}> = ({title, children}) => (
  <Container>
    <Heading>{title}</Heading>
    <Divider />
    <FlexColumn>{children}</FlexColumn>
  </Container>
);

export default RoundedSection;

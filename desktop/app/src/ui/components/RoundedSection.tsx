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
import {theme, Layout} from 'flipper-plugin';
import {Typography} from 'antd';

const Divider = styled.hr({
  margin: '16px -20px 20px -20px',
  border: 'none',
  borderTop: `1px solid ${theme.dividerColor}`,
});
Divider.displayName = 'RoundedSection:Divider';

const Container = styled.div({
  background: theme.backgroundDefault,
  borderRadius: theme.space.medium,
  boxShadow: `0 1px 3px ${theme.dividerColor}`,
  marginBottom: theme.space.large,
  width: '100%',
  padding: theme.space.large,
});
Container.displayName = 'RoundedSection:Container';

/**
 * Section with a title, dropshadow, rounded border and white backgorund.
 *
 * Recommended to be used inside a CenteredView
 */
const RoundedSection: React.FC<{title: string}> = ({title, children}) => (
  <Container>
    <Typography.Title level={3}>{title}</Typography.Title>
    <Divider />
    <Layout.Container>{children}</Layout.Container>
  </Container>
);

export default RoundedSection;

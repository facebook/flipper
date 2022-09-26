/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography} from 'antd';
import styled from '@emotion/styled';
// This import is OK since it is a type-only import
// eslint-disable-next-line no-restricted-imports
import type {ParagraphProps} from 'antd/lib/typography/Paragraph';

export function CodeBlock({children, ...props}: ParagraphProps) {
  return (
    <StyledParagrah {...props}>
      <pre>{children}</pre>
    </StyledParagrah>
  );
}

const StyledParagrah = styled(Typography.Paragraph)({
  padding: 0,
  fontSize: '9pt',
  '&.ant-typography': {
    margin: 0,
  },
  '& pre': {
    margin: 0,
    border: 'none',
    background: 'none',
  },
});

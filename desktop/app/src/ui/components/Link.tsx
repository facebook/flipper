/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {colors} from './colors';
import {useCallback} from 'react';
import {shell} from 'electron';
import React from 'react';
import {useIsSandy} from '../../sandy-chrome/SandyContext';
import {Typography} from 'antd';

const StyledLink = styled.span({
  color: colors.highlight,
  '&:hover': {
    cursor: 'pointer',
    textDecoration: 'underline',
  },
});
StyledLink.displayName = 'Link:StyledLink';

const AntOriginalLink = Typography.Link;

export default function Link(props: {
  href: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: ((event: React.MouseEvent<any>) => void) | undefined;
}) {
  const isSandy = useIsSandy();
  const onClick = useCallback(
    (e: React.MouseEvent<any>) => {
      shell.openExternal(props.href);
      e.preventDefault();
      e.stopPropagation();
    },
    [props.href],
  );

  return isSandy ? (
    <AntOriginalLink {...props} onClick={props.onClick ?? onClick} />
  ) : (
    <StyledLink onClick={props.onClick ?? onClick} style={props.style}>
      {props.children || props.href}
    </StyledLink>
  );
}

// XXX. For consistent usage, we monkey patch AntDesign's Link component,
// as we never want to open links internally, which gives a really bad experience
// @ts-ignore
Typography.Link = Link;

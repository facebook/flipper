/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import styled from '../styled/index.js';
import {Component} from 'react';
import {shell} from 'electron';

const StyledLink = styled.text(
  {
    color: (props, theme) => theme.accent,

    '&:hover': {
      cursor: 'pointer',
      textDecoration: 'underline',
    },
  },
  {
    ignoreAttributes: [],
  },
);

export default class Link extends Component<{
  href: string,
  children?: React$Node,
}> {
  onClick = () => {
    shell.openExternal(this.props.href);
  };

  render() {
    return (
      <StyledLink onClick={this.onClick}>{this.props.children}</StyledLink>
    );
  }
}

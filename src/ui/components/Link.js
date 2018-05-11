/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import {colors} from './colors.js';
import {Component} from 'react';
import {shell} from 'electron';

const StyledLink = styled.text(
  {
    color: colors.highlight,
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

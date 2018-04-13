/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import styled from '../styled/index.js';
import {Component} from 'react';

const PropTypes = require('prop-types');

const ButtonGroupContainer = styled.view({
  display: 'inline-flex',
  marginLeft: 10,
  '&:first-child': {
    marginLeft: 0,
  },
});

/**
 * Group a series of buttons together.
 *
 * @example List of buttons
 *   <ButtonGroup>
 *     <Button>One</Button>
 *     <Button>Two</Button>
 *     <Button>Three</Button>
 *   </ButtonGroup>
 */
export default class ButtonGroup extends Component<{
  children: React$Node,
}> {
  getChildContext() {
    return {inButtonGroup: true};
  }

  render() {
    return <ButtonGroupContainer>{this.props.children}</ButtonGroupContainer>;
  }
}

ButtonGroup.childContextTypes = {
  inButtonGroup: PropTypes.bool,
};

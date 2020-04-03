/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import React, {Component} from 'react';
import PropTypes from 'prop-types';

const ButtonGroupContainer = styled.div({
  display: 'inline-flex',
  marginLeft: 10,
  '&:first-child': {
    marginLeft: 0,
  },
});
ButtonGroupContainer.displayName = 'ButtonGroup:ButtonGroupContainer';

/**
 * Group a series of buttons together.
 *
 * ```jsx
 *   <ButtonGroup>
 *     <Button>One</Button>
 *     <Button>Two</Button>
 *     <Button>Three</Button>
 *   </ButtonGroup>
 * ```
 */
export default class ButtonGroup extends Component<{
  children: React.ReactNode;
}> {
  static childContextTypes = {
    inButtonGroup: PropTypes.bool,
  };

  getChildContext() {
    return {inButtonGroup: true};
  }

  render() {
    return <ButtonGroupContainer>{this.props.children}</ButtonGroupContainer>;
  }
}

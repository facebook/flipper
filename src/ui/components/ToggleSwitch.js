/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import styled from '../styled/index.js';
import {colors} from './colors.js';

export const StyledButton = styled.view({
  cursor: 'pointer',
  width: '30px',
  height: '16px',
  background: props => (props.toggled ? colors.green : colors.grey),
  display: 'block',
  borderRadius: '100px',
  position: 'relative',
  marginLeft: '15px',
  '&::after': {
    content: `''`,
    position: 'absolute',
    top: '3px',
    left: props => (props.toggled ? '18px' : '3px'),
    width: '10px',
    height: '10px',
    background: 'white',
    borderRadius: '100px',
    transition: 'all cubic-bezier(0.3, 1.5, 0.7, 1) 0.3s',
  },
});

type Props = {
  /**
   * onClick handler.
   */
  onClick?: (event: SyntheticMouseEvent<>) => void,
  /**
   * whether the button is toggled
   */
  toggled?: boolean,
};

/**
 * Toggle Button.
 *
 * **Usage**
 *
 * ```jsx
 * import {ToggleButton} from 'sonar';
 * <ToggleButton onClick={handler} toggled={boolean}/>
 * ```
 */
export default class ToggleButton extends styled.StylableComponent<Props> {
  render() {
    return (
      <StyledButton toggled={this.props.toggled} onClick={this.props.onClick} />
    );
  }
}

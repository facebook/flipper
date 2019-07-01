/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import React, {Component} from 'react';
import PropTypes from 'prop-types';

import styled from '../styled/index.js';
import Glyph from './Glyph.js';

const IconContainer = styled('div')({
  width: 0,
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  pointerEvents: 'none',
});

const ButtonGroupChainContainer = styled('div')(props => ({
  display: 'inline-flex',
  marginLeft: 10,
  '&:first-child>*:not(:first-child):nth-child(odd)': {
    paddingLeft: props.iconSize + 6,
  },
  '&:first-child>*': {
    borderRightStyle: 'none',
    borderLeftStyle: 'none',
  },
  '&:first-child>:first-child': {
    borderLeftStyle: 'solid',
  },
  '&:first-child>:last-child': {
    borderRightStyle: 'solid',
  },
}));

type Props = {
  /**
   * Children.
   */
  children: React$Node,
  /**
   * Size of the button seperator icon in pixels.
   */
  iconSize: 8 | 10 | 12 | 16 | 18 | 20 | 24 | 32,
  /**
   * Name of the icon seperating the buttons. Defaults to 'chevron-right'.
   */
  icon?: string,
};

/**
 * Groups a series of buttons together with
 * a right-chevron icon to seperate them.
 * Used to create a navigation heirarchy.
 *
 * ```jsx
 *   <ButtonGroupChain iconSize={12}>
 *     <Button>One</Button>
 *     <Button>Two</Button>
 *     <Button>Three</Button>
 *   </ButtonGroupChain>
 * ```
 */
export default class ButtonGroupChain extends Component<Props> {
  getChildContext() {
    return {inButtonGroup: true};
  }

  render() {
    const {children, iconSize, icon} = this.props;

    return (
      <ButtonGroupChainContainer iconSize={iconSize}>
        {React.Children.map(children, (child, idx) => {
          if (idx === 0) {
            return child;
          }
          return (
            <>
              <IconContainer>
                <Glyph name={icon || 'chevron-right'} size={iconSize} />
              </IconContainer>
              {child}
            </>
          );
        })}
      </ButtonGroupChainContainer>
    );
  }
}

ButtonGroupChain.childContextTypes = {
  inButtonGroup: PropTypes.bool,
};

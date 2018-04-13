/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {StyledComponent} from '../styled/index.js';
import styled from '../styled/index.js';

const animation = styled.keyframes({
  '0%': {
    transform: 'rotate(0deg)',
  },
  '100%': {
    transform: 'rotate(360deg)',
  },
});

const LoadingIndicator: StyledComponent<{
  size?: number,
}> = styled.view(
  {
    animation: `${animation} 1s infinite linear`,
    width: props => props.size,
    height: props => props.size,
    minWidth: props => props.size,
    minHeight: props => props.size,
    borderRadius: '50%',
    border: props => `${props.size / 6}px solid rgba(0, 0, 0, 0.2)`,
    borderLeftColor: 'rgba(0, 0, 0, 0.4)',
  },
  {
    ignoreAttributes: ['size'],
  },
);

LoadingIndicator.defaultProps = {
  size: 50,
};

export default LoadingIndicator;

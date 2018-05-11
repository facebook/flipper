/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';

const View = styled.view(
  {
    height: props => (props.fill ? '100%' : 'auto'),
    overflow: props => (props.scrollable ? 'auto' : 'visible'),
    position: 'relative',
    width: props => (props.fill ? '100%' : 'auto'),
  },
  {
    ignoreAttributes: ['fill', 'scrollable'],
  },
);

export default View;

/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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

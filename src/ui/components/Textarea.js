/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import styled from '../styled/index.js';
import {inputStyle} from './Input.js';

export default styled.customHTMLTag(
  'textarea',
  {
    ...inputStyle,
    lineHeight: 'normal',
    padding: props => (props.compact ? '5px' : '8px'),
    resize: 'none',
  },
  {
    ignoreAttributes: ['compact'],
  },
);

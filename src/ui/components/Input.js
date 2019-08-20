/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import {colors} from './colors.tsx';

export const inputStyle = (compact: boolean) => ({
  border: `1px solid ${colors.light15}`,
  borderRadius: 4,
  font: 'inherit',
  fontSize: '1em',
  height: compact ? '17px' : '28px',
  lineHeight: compact ? '17px' : '28px',
  marginRight: 5,

  '&:disabled': {
    backgroundColor: '#ddd',
    borderColor: '#ccc',
    cursor: 'not-allowed',
  },
});

const Input = styled('input')(({compact}) => ({
  ...inputStyle(compact),
  padding: compact ? '0 5px' : '0 10px',
}));

Input.defaultProps = {
  type: 'text',
};

export default Input;

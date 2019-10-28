/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from 'react-emotion';
import {colors} from './colors';

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

const Input = styled('input')(({compact}: {compact?: boolean}) => ({
  ...inputStyle(compact || false),
  padding: compact ? '0 5px' : '0 10px',
}));

Input.defaultProps = {
  type: 'text',
};

export default Input;

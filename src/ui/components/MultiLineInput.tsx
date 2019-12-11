/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {colors} from './colors';

export const multilineStyle = (props: {valid: boolean}) => ({
  border: `1px solid ${props.valid === false ? colors.red : colors.light15}`,
  borderRadius: 4,
  font: 'inherit',
  fontSize: '1em',
  height: '28px',
  lineHeight: '28px',
  marginRight: 5,

  '&:disabled': {
    backgroundColor: '#ddd',
    borderColor: '#ccc',
    cursor: 'not-allowed',
  },
});

const MultiLineInput = styled.textarea<{valid?: boolean}>(props => ({
  ...multilineStyle({valid: props.valid === undefined || props.valid}),
  padding: '0 10px',
}));
MultiLineInput.displayName = 'MultiLineInput';

export default MultiLineInput;

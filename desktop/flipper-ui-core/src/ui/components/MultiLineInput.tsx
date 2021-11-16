/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {theme} from 'flipper-plugin';

export const multilineStyle = (props: {valid: boolean}) => ({
  border: `1px solid ${
    props.valid === false ? theme.errorColor : theme.dividerColor
  }`,
  borderRadius: 4,
  font: 'inherit',
  fontSize: '1em',
  height: '28px',
  lineHeight: '28px',
  marginRight: 5,
  backgroundColor: theme.backgroundDefault,
  '&:disabled': {
    backgroundColor: theme.backgroundWash,
    cursor: 'not-allowed',
  },
});

const MultiLineInput = styled.textarea<{valid?: boolean}>((props) => ({
  ...multilineStyle({valid: props.valid === undefined || props.valid}),
  padding: '0 10px',
}));
MultiLineInput.displayName = 'MultiLineInput';

export default MultiLineInput;

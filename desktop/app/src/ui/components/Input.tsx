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

export const inputStyle = (props: {
  compact: boolean;
  valid: boolean;
  readOnly: boolean;
}) => ({
  border: `1px solid ${props.valid ? theme.dividerColor : theme.errorColor}`,
  borderRadius: 4,
  font: 'inherit',
  fontSize: '1em',

  height: props.compact ? '17px' : '28px',
  lineHeight: props.compact ? '17px' : '28px',
  backgroundColor: props.readOnly
    ? theme.backgroundWash
    : theme.backgroundDefault,
  '&:disabled': {
    backgroundColor: theme.disabledColor,
    borderColor: theme.disabledColor,
    cursor: 'not-allowed',
  },
});

const Input = styled.input<{
  compact?: boolean;
  valid?: boolean;
  readOnly?: boolean;
}>(({compact, valid, readOnly}) => ({
  ...inputStyle({
    compact: compact || false,
    valid: valid !== false,
    readOnly: readOnly === true,
  }),
  padding: compact ? '0 5px' : '0 10px',
}));

Input.displayName = 'Input';

Input.defaultProps = {
  type: 'text',
};

export default Input;

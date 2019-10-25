/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from 'react-emotion';
import {inputStyle} from './Input';

export default styled('textarea')(({compact}: {compact?: boolean}) => ({
  ...inputStyle(compact || false),
  lineHeight: 'normal',
  padding: compact ? '5px' : '8px',
  resize: 'none',
}));

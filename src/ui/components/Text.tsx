/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {
  ColorProperty,
  FontSizeProperty,
  TextAlignProperty,
  FontFamilyProperty,
  WhiteSpaceProperty,
  WordWrapProperty,
  CursorProperty,
} from 'csstype';

/**
 * A Text component.
 */
const Text = styled.span<{
  color?: ColorProperty;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlignProperty;
  size?: FontSizeProperty<number>;
  code?: boolean;
  family?: FontFamilyProperty;
  selectable?: boolean;
  wordWrap?: WordWrapProperty;
  whiteSpace?: WhiteSpaceProperty;
  cursor?: CursorProperty;
}>(props => ({
  color: props.color ? props.color : 'inherit',
  cursor: props.cursor ? props.cursor : 'auto',
  display: 'inline',
  fontWeight: props.bold ? 'bold' : 'inherit',
  fontStyle: props.italic ? 'italic' : 'normal',
  textAlign: props.align || 'left',
  fontSize: props.size == null && props.code ? 12 : props.size,
  textDecoration: props.underline ? 'underline' : 'initial',
  fontFamily: props.code
    ? 'SF Mono, Monaco, Andale Mono, monospace'
    : props.family,
  overflow: props.code ? 'auto' : 'visible',
  userSelect:
    props.selectable || (props.code && typeof props.selectable === 'undefined')
      ? 'text'
      : 'none',
  wordWrap: props.code ? 'break-word' : props.wordWrap,
  whiteSpace:
    props.code && typeof props.whiteSpace === 'undefined'
      ? 'pre'
      : props.whiteSpace,
}));
Text.displayName = 'Text';

export default Text;

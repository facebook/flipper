/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {Property} from 'csstype';

/**
 * A Text component.
 */
const Text = styled.span<{
  color?: Property.Color;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: Property.TextAlign;
  size?: Property.FontSize<number>;
  code?: boolean;
  family?: Property.FontFamily;
  selectable?: boolean;
  wordWrap?: Property.WordWrap;
  whiteSpace?: Property.WhiteSpace;
  cursor?: Property.Cursor;
}>((props) => ({
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
    props.selectable === false
      ? 'none'
      : props.selectable === true
      ? 'text'
      : undefined,
  wordWrap: props.code ? 'break-word' : props.wordWrap,
  whiteSpace:
    props.code && typeof props.whiteSpace === 'undefined'
      ? 'pre'
      : props.whiteSpace,
}));
Text.displayName = 'Text';

export default Text;

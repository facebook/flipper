/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {StyledComponent} from '../styled/index.js';
import styled from '../styled/index.js';

/**
 * A Text component.
 */
const Text: StyledComponent<{
  /**
   * Color of text.
   */
  color?: string,
  /**
   * Whether this text is bold. Equivalent to the following CSS:
   *
   *  font-weight: bold;
   */
  bold?: boolean,
  /**
   * Whether this text is italic. Equivalent to the following CSS:
   *
   *  font-style: italic;
   */
  italic?: boolean,
  /**
   * Whether to format the text as code. Equivalent to the following CSS:
   *
   *  font-size: Andale Mono, monospace;
   *  overflow: auto;
   *  user-select: text;
   *  white-space: pre-wrap;
   *  word-wrap: break-word;
   */
  code?: boolean,
  /**
   * Whether this text is underlined. Equivalent to the following CSS:
   *
   *  text-decoration: underline;
   */
  underline?: boolean,
  /**
   * Whether this text is striked. Equivalent to the following CSS:
   *
   *  text-decoration: line-through;
   */
  strike?: boolean,
  /**
   * Whether this text is selectable by the cursor. Equivalent to the following CSS:
   *
   *  user-select: text;
   */
  selectable?: boolean,
  /**
   * Alignment of the text. Equivalent to the `text-align` CSS rule.
   */
  align?: 'left' | 'center' | 'right',
  /**
   * Font size to use. Equivalent to the `font-size` CSS rule.
   */
  size?: string | number,
  /**
   * Font family to use. Equivalent to the `font-family` CSS rule.
   */
  family?: string,
  /**
   * Word wrap to use. Equivalent to the `word-wrap` CSS rule.
   */
  wordWrap?: string,
  /**
   * White space to use. Equivalent to the `white-space` CSS rule.
   */
  whiteSpace?: string,
}> = styled.text(
  {
    color: props => (props.color ? props.color : 'inherit'),
    display: 'inline',
    fontWeight: props => (props.bold ? 'bold' : 'inherit'),
    fontStyle: props => (props.italic ? 'italic' : 'normal'),
    textAlign: props => props.align || 'left',
    fontSize: props => {
      if (props.size == null && props.code) {
        return 12;
      } else {
        return props.size;
      }
    },
    fontFamily: props => {
      if (props.code) {
        return 'SF Mono, Monaco, Andale Mono, monospace';
      } else {
        return props.family;
      }
    },
    overflow: props => {
      if (props.code) {
        return 'auto';
      } else {
        return 'visible';
      }
    },
    textDecoration: props => {
      if (props.underline) {
        return 'underline';
      } else if (props.strike) {
        return 'line-through';
      } else {
        return 'none';
      }
    },
    userSelect: props => {
      if (
        props.selectable ||
        (props.code && typeof props.selectable === 'undefined')
      ) {
        return 'text';
      } else {
        return 'none';
      }
    },
    wordWrap: props => {
      if (props.code) {
        return 'break-word';
      } else {
        return props.wordWrap;
      }
    },
    whiteSpace: props => {
      if (props.code && typeof props.whiteSpace === 'undefined') {
        return 'pre';
      } else {
        return props.whiteSpace;
      }
    },
  },
  {
    ignoreAttributes: [
      'selectable',
      'whiteSpace',
      'wordWrap',
      'align',
      'code',
      'family',
      'size',
      'bold',
      'italic',
      'strike',
      'underline',
      'color',
    ],
  },
);

export default Text;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {css} from '@emotion/css';
import {theme} from 'flipper-plugin';

export const inputBase = css`
  overflow: hidden; //stop random scrollbars from showing up
  font-size: small;
  padding: 2px 4px 2px 4px;
  min-height: 20px !important; //this is for text area
`;

/**
 * disables hover and focsued states
 */
export const readOnlyInput = css`
  :hover {
    border-color: ${theme.disabledColor} !important;
  }
  :focus {
    border-color: ${theme.disabledColor} !important;

    box-shadow: none !important;
  }
  box-shadow: none !important;
  border-color: ${theme.disabledColor} !important;
  cursor: not-allowed !important;
  & input {
    cursor: not-allowed !important;
  }
`;

export const boolColor = '#C41D7F';
export const stringColor = '#AF5800';
export const enumColor = '#006D75';
export const numberColor = '#003EB3';
export const rowHeight = 26;

export function opactity(optimistic: {pending: boolean}) {
  return {opacity: optimistic.pending ? 0.7 : 1};
}

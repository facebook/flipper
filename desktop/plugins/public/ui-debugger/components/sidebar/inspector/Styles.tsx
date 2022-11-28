/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {theme} from 'flipper-plugin';

export const InspectorStyle = {
  strokeColor: '#4A5967',
  outerFillColor: '#F2F3F7',
  innerFillColor: '#CCD1D9',
  spaceBox: {
    size: 180,
    margin: 10,
    separator: 4,
  },
  bounds: {
    size: 180,
    multiplier: 0.4,
    margin: 4,
    separator: 10,
  },
} as const;

export const RowStyle = {
  marginTop: 4,
  marginBottom: 4,
  borderStyle: 'solid',
  borderColor: theme.dividerColor,
  borderWidth: '0 0 1px 0',
} as const;

export const ObjectContainerStyle = {
  borderLeftWidth: 5,
  borderLeftColor: 'lightgray',
  borderLeftStyle: 'solid',
} as const;

export const DefaultInputContainerStyle = {
  margin: 'auto',
  padding: '2px',
  minWidth: '50px',
  backgroundColor: theme.backgroundDefault,
  borderRadius: '5px',
  boxShadow: '0 0 0 1px rgba(0,0,0,.2)',
  display: 'inline-block',
} as const;

export const NumberAttributeValueStyle = {
  color: theme.semanticColors.numberValue,
  display: 'flex',
} as const;

export const BooleanAttributeValueStyle = {
  color: theme.semanticColors.booleanValue,
  fontSize: theme.fontSize.small,
  alignItems: 'center',
} as const;

export const TextAttributeValueStyle = {
  color: theme.semanticColors.stringValue,
  display: 'flex',
} as const;

export const EnumAttributeValueStyle = {
  color: theme.semanticColors.stringValue,
  fontSize: theme.fontSize.small,
  margin: 'auto',
} as const;

export const CenteredNumberStyle = {
  textAlign: 'center',
  color: theme.semanticColors.numberValue,
} as const;

export const CenteredTextStyle = {
  textAlign: 'center',
} as const;

export const CenteredContentStyle = {
  paddingLeft: '20%',
  paddingRight: '20%',
} as const;

export const CenteredHeadingContentStyle = {
  ...CenteredContentStyle,
  fontSize: theme.fontSize.small,
} as const;

export const ColorOuterButtonStyle = {
  padding: '5px',
  backgroundColor: '#fff',
  borderRadius: '5px',
  boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
  display: 'inline-block',
  cursor: 'pointer',
} as const;

export const ColorInnerButtonStyle = {
  width: '36px',
  height: '14px',
  borderRadius: '2px',
} as const;

export const AutoMarginStyle = {
  margin: 'auto',
} as const;

export const TopSpacedContainerStyle = {
  marginTop: 10,
} as const;

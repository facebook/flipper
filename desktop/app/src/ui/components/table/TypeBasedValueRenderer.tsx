/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as styled} from '@emotion/styled';
import {colors} from '../colors';
import {default as Text} from '../Text';
import React from 'react';

export type Value =
  | {
      type: 'string' | 'blob';
      value: string;
    }
  | {
      type: 'boolean';
      value: boolean;
    }
  | {
      type: 'integer' | 'float' | 'double' | 'number';
      value: number;
    }
  | {
      type: 'null';
      value: null;
    };

const WrappingText = styled(Text)({
  wordWrap: 'break-word',
  width: '100%',
  lineHeight: '125%',
  padding: '3px 0',
});
WrappingText.displayName = 'TypeBasedValueRenderer:WrappingText';

const NonWrappingText = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  userSelect: 'none',
});
NonWrappingText.displayName = 'TypeBasedValueRenderer:NonWrappingText';

const BooleanValue = styled(NonWrappingText)<{active?: boolean}>((props) => ({
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: props.active ? colors.green : colors.red,
    marginRight: 5,
    marginTop: 1,
  },
}));
BooleanValue.displayName = 'TypeBasedValueRenderer:BooleanValue';

export function valueToNullableString(val: Value): string | null {
  return val.value?.toString() ?? null;
}

export function renderValue(val: Value, wordWrap?: boolean) {
  const TextComponent = wordWrap ? WrappingText : NonWrappingText;
  switch (val.type) {
    case 'boolean':
      return (
        <BooleanValue code={true} active={val.value}>
          {val.value.toString()}
        </BooleanValue>
      );
    case 'blob':
    case 'string':
      return <TextComponent>{val.value}</TextComponent>;
    case 'integer':
    case 'float':
    case 'double':
    case 'number':
      return <TextComponent>{val.value}</TextComponent>;
    case 'null':
      return <TextComponent>NULL</TextComponent>;
    default:
      return <TextComponent />;
  }
}

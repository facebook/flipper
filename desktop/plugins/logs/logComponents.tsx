/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Text, colors, Glyph, styled} from 'flipper';

export const Icon = styled(Glyph)({
  marginTop: 5,
});

export const HiddenScrollText = styled(Text)({
  userSelect: 'none',
  alignSelf: 'baseline',
  lineHeight: '130%',
  marginTop: 5,
  paddingBottom: 3,
  '&::-webkit-scrollbar': {
    display: 'none',
  },
});

export const LogCount = styled.div<{backgroundColor: string}>(
  ({backgroundColor}) => ({
    backgroundColor,
    borderRadius: '999em',
    fontSize: 11,
    marginTop: 4,
    minWidth: 16,
    height: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: '16px',
    paddingLeft: 4,
    paddingRight: 4,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  }),
);

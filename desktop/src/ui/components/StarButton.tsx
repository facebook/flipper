/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState, useCallback} from 'react';
import {colors} from './colors';
import Glyph from './Glyph';
import styled from '@emotion/styled';

const DownscaledGlyph = styled(Glyph)({
  maskSize: '12px 12px',
  WebkitMaskSize: '12px 12px',
  height: 12,
  width: 12,
});
DownscaledGlyph.displayName = 'StarButton:DownscaledGlyph';

export function StarButton({
  starred,
  onStar,
}: {
  starred: boolean;
  onStar: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStar();
    },
    [onStar],
  );
  const handleMouseEnter = useCallback(setHovered.bind(null, true), []);
  const handleMouseLeave = useCallback(setHovered.bind(null, false), []);
  return (
    <button
      style={{
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: 0,
        paddingLeft: 4,
        flex: 0,
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <DownscaledGlyph
        size={
          16 /* the icons used below are not available in smaller sizes :-/ */
        }
        name={hovered ? (starred ? 'star-slash' : 'life-event-major') : 'star'}
        color={hovered ? colors.lemonDark1 : colors.macOSTitleBarIconBlur}
        variant={hovered || starred ? 'filled' : 'outline'}
      />
    </button>
  );
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Glyph from './Glyph';
import Tooltip from './Tooltip';
import {colors} from './colors';
import styled from '@emotion/styled';
import React from 'react';

type Props = React.ComponentProps<typeof ToolbarIconContainer> & {
  active?: boolean;
  icon: string;
  title: string;
  onClick: () => void;
};

const ToolbarIconContainer = styled.div({
  marginRight: 9,
  marginTop: -3,
  marginLeft: 4,
  position: 'relative', // for settings popover positioning
});

export default function ToolbarIcon({active, icon, title, ...props}: Props) {
  return (
    <Tooltip title={title}>
      <ToolbarIconContainer {...props}>
        <Glyph
          name={icon}
          size={16}
          color={
            active
              ? colors.macOSTitleBarIconSelected
              : colors.macOSTitleBarIconActive
          }
        />
      </ToolbarIconContainer>
    </Tooltip>
  );
}

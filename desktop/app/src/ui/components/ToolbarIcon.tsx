/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Glyph from './Glyph';
import {colors} from './colors';
import styled from '@emotion/styled';
import React from 'react';

type Props = {
  title: string;
  icon: string;
  active: boolean;
  onClick: () => void;
};

const ToolbarIcon = styled.div({
  marginRight: 9,
  marginTop: -3,
  marginLeft: 4,
  position: 'relative', // for settings popover positioning
});

export default function (props: Props) {
  return (
    <ToolbarIcon onClick={props.onClick} title={props.title}>
      <Glyph
        name={props.icon}
        size={16}
        color={
          props.active
            ? colors.macOSTitleBarIconSelected
            : colors.macOSTitleBarIconActive
        }
      />
    </ToolbarIcon>
  );
}

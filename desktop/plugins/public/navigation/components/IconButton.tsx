/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Glyph, styled, keyframes, IconSize} from 'flipper';
import React from 'react';

const shrinkAnimation = keyframes({
  '0%': {
    transform: 'scale(1);',
  },
  '100%': {
    transform: 'scale(.9)',
  },
});

type Props = {
  icon: string;
  outline?: boolean;
  onClick?: () => void;
  color?: string;
  size: IconSize;
};

const RippleEffect = styled.div({
  padding: 5,
  borderRadius: 100,
  backgroundPosition: 'center',
  transition: 'background 0.5s',
  ':hover': {
    background:
      'rgba(155, 155, 155, 0.2) radial-gradient(circle, transparent 1%, rgba(155, 155, 155, 0.2) 1%) center/15000%',
  },
  ':active': {
    backgroundColor: 'rgba(201, 200, 200, 0.5)',
    backgroundSize: '100%',
    transition: 'background 0s',
  },
});

const IconButtonContainer = styled.div({
  ':active': {
    animation: `${shrinkAnimation} .25s ease forwards`,
  },
});

export function IconButton(props: Props) {
  return (
    <RippleEffect>
      <IconButtonContainer className="icon-button" onClick={props.onClick}>
        <Glyph
          name={props.icon}
          size={props.size}
          color={props.color}
          variant={props.outline ? 'outline' : 'filled'}
        />
      </IconButtonContainer>
    </RippleEffect>
  );
}

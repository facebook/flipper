/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import styled from '../styled/index.js';
const PropTypes = require('prop-types');
import {getIconUrl} from '../../utils/icons.js';

const ColoredIconBlack = styled('img')(({size}) => ({
  height: size,
  verticalAlign: 'middle',
  width: size,
}));

const ColoredIconCustom = styled('div')(props => ({
  height: props.size,
  verticalAlign: 'middle',
  width: props.size,
  backgroundColor: props.color,
  display: 'inline-block',
  maskImage: `url('${props.src}')`,
  maskSize: '100% 100%',
  WebkitMaskImage: `url('${props.src}')`,
  WebkitMaskSize: '100% 100%',
}));

export function ColoredIcon(
  props: {|
    name: string,
    src: string,
    size?: number,
    className?: string,
    color?: string,
  |},
  context: {|
    glyphColor?: string,
  |},
) {
  const {color = context.glyphColor, name, size = 16, src} = props;

  const isBlack =
    color == null ||
    color === '#000' ||
    color === 'black' ||
    color === '#000000';

  if (isBlack) {
    return (
      <ColoredIconBlack
        alt={name}
        src={src}
        size={size}
        className={props.className}
      />
    );
  } else {
    return (
      <ColoredIconCustom
        color={color}
        size={size}
        src={src}
        className={props.className}
      />
    );
  }
}

ColoredIcon.contextTypes = {
  glyphColor: PropTypes.string,
};

export default class Glyph extends React.Component<{
  name: string,
  size?: 8 | 10 | 12 | 16 | 18 | 20 | 24 | 32,
  variant?: 'filled' | 'outline',
  className?: string,
  color?: string,
}> {
  render() {
    const {name, size, variant, color, className} = this.props;

    return (
      <ColoredIcon
        name={name}
        className={className}
        color={color}
        size={size}
        src={getIconUrl(name, size, variant)}
      />
    );
  }
}

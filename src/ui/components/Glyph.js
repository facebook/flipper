/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
const PropTypes = require('prop-types');
import {getIconUrl} from '../../utils/icons.js';

const ColoredIconBlack = styled.image(
  {
    height: props => props.size,
    verticalAlign: 'middle',
    width: props => props.size,
  },
  {
    ignoreAttributes: ['size'],
  },
);

const ColoredIconCustom = styled.view(
  {
    height: props => props.size,
    verticalAlign: 'middle',
    width: props => props.size,
    backgroundColor: props => props.color,
    display: 'inline-block',
    maskImage: props => `url('${props.src}')`,
    maskSize: '100% 100%',
    // $FlowFixMe: prefixed property
    WebkitMaskImage: props => `url('${props.src}')`,
    // $FlowFixMe: prefixed property
    WebkitMaskSize: '100% 100%',
  },
  {
    ignoreAttributes: ['color', 'size', 'src'],
  },
);

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

export default class Glyph extends styled.StylablePureComponent<{
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

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Popover} from 'antd';
import {Color} from '../../../types';
import {SketchPicker, RGBColor, ColorResult} from 'react-color';
import {styled} from 'flipper-plugin';
import {ColorInnerButtonStyle, ColorOuterButtonStyle} from './Styles';

type State = {
  color: RGBColor;
};

const OuterColorButton = styled.div(ColorOuterButtonStyle);
const InnerColorButton = styled.div(ColorInnerButtonStyle);

class ColorInspector extends React.Component<{color: Color}> {
  state: State = {
    color: this.props.color ?? {
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    },
  };

  handleChange = (_color: ColorResult) => {
    // No color changes to be applied at this stage.
    // this.setState({color: color.rgb});
  };

  render() {
    return (
      <Popover
        placement="bottomRight"
        content={
          <SketchPicker color={this.state.color} onChange={this.handleChange} />
        }
        trigger="click">
        <OuterColorButton role="button" tabIndex={0}>
          <InnerColorButton
            style={{
              background: `rgba(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b}, ${this.state.color.a})`,
            }}
          />
        </OuterColorButton>
      </Popover>
    );
  }
}

export default ColorInspector;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Col, Popover, Row} from 'antd';
import {Color} from '../../../types';
import {SketchPicker, ColorResult} from 'react-color';
import {styled} from 'flipper-plugin';
import {
  AutoMarginStyle,
  ColorInnerButtonStyle,
  ColorOuterButtonStyle,
  NumberAttributeValueStyle,
  ObjectContainerStyle,
  RowStyle,
} from './Styles';
import {theme} from 'flipper-plugin';

type Props = {
  name: string;
  color: Color;
};

const DefaultColor: Color = {
  r: 255,
  g: 255,
  b: 255,
  a: 1,
};

const CenteredContentContainer = styled.div(AutoMarginStyle);
const ObjectContainer = styled.div(ObjectContainerStyle);
const NumberValue = styled.span(NumberAttributeValueStyle);
const OuterColorButton = styled.div(ColorOuterButtonStyle);
const InnerColorButton = styled.div(ColorInnerButtonStyle);

const RGBA = styled.span({color: theme.semanticColors.numberValue});

const RGBAtoHEX = (color: Color) => {
  const hex =
    (color.r | (1 << 8)).toString(16).slice(1) +
    (color.g | (1 << 8)).toString(16).slice(1) +
    (color.b | (1 << 8)).toString(16).slice(1);

  return '#' + hex.toUpperCase();
};

class ColorPicker extends React.Component<{color: Color}> {
  handleChange = (_color: ColorResult) => {
    // No color changes to be applied at this stage.
  };
  render() {
    return (
      <Popover
        placement="bottomRight"
        content={
          <SketchPicker color={this.props.color} onChange={this.handleChange} />
        }
        trigger="click">
        <OuterColorButton role="button" tabIndex={0}>
          <InnerColorButton
            style={{
              background: `rgba(${this.props.color.r}, ${this.props.color.g}, ${this.props.color.b}, ${this.props.color.a})`,
            }}
          />
        </OuterColorButton>
      </Popover>
    );
  }
}

const ColorHEX: React.FC<{color: Color}> = ({color}) => (
  <NumberValue>{RGBAtoHEX(color)}</NumberValue>
);

const ColorRGBA: React.FC<{color: Color}> = ({color}) => (
  <>
    r: <RGBA>{color.r}</RGBA> g: <RGBA>{color.g}</RGBA> b:{' '}
    <RGBA>{color.b}</RGBA> a: <RGBA>{color.a}</RGBA>
  </>
);

class ColorInspector extends React.Component<Props> {
  render() {
    return (
      <>
        <Row>
          <Col span={8} style={AutoMarginStyle}>
            {this.props.name}
          </Col>
          <Col span={16}>
            <CenteredContentContainer>
              <ColorPicker color={this.props.color} />
            </CenteredContentContainer>
          </Col>
        </Row>
        <Row style={RowStyle}>
          <Col span={8} style={AutoMarginStyle}>
            <ObjectContainer
              style={{
                paddingLeft: 2,
              }}>
              Hex
            </ObjectContainer>
          </Col>
          <Col span={16}>
            <CenteredContentContainer>
              <ColorHEX color={this.props.color} />
            </CenteredContentContainer>
          </Col>
        </Row>
        <Row style={RowStyle}>
          <Col span={8} style={AutoMarginStyle}>
            <ObjectContainer
              style={{
                paddingLeft: 2,
              }}>
              RGBA
            </ObjectContainer>
          </Col>
          <Col span={16}>
            <CenteredContentContainer>
              <ColorRGBA color={this.props.color} />
            </CenteredContentContainer>
          </Col>
        </Row>
      </>
    );
  }
}

export default ColorInspector;

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  FlexBox,
  FlexColumn,
  FlexRow,
  Text,
  View,
  styled,
  Glyph,
  colors,
  brandColors,
  PureComponent,
} from 'sonar';

const Containter = FlexColumn.extends({
  fontSize: 17,
  justifyContent: 'center',
  marginLeft: 60,
  marginRight: 60,
  width: 'auto',
  fontWeight: 300,
  lineHeight: '140%',
  maxWidth: 700,
  minWidth: 450,
});

const TitleRow = FlexRow.extends({
  alignItems: 'center',
  marginBottom: 40,
});

const Icon = FlexBox.extends({
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: brandColors.Sonar,
  width: 32,
  height: 32,
  flexShrink: 0,
  borderRadius: 6,
});

const Title = Text.extends({
  fontSize: 30,
  fontWeight: 300,
  paddingLeft: 10,
});

const Button = View.extends({
  marginTop: 40,
  marginBottom: 30,
  borderRadius: 6,
  color: colors.white,
  border: 'none',
  background: brandColors.Sonar,
  padding: '10px 30px',
  fontWeight: 500,
  fontSize: '1em',
  alignSelf: 'flex-start',
});

const Screenshot = styled.customHTMLTag('img', {
  alignSelf: 'center',
  boxShadow: '0 5px 35px rgba(0,0,0,0.3)',
  borderRadius: 5,
  border: `1px solid ${colors.macOSTitleBarBorder}`,
  transform: 'translateX(5px)',
  overflow: 'hidden',
  maxHeight: '80%',
  flexShrink: 0,
});

type Props = {
  title: string,
  icon?: string,
  screenshot?: ?string,
  children: React.Node,
  onDismiss: () => void,
};

export default class Intro extends PureComponent<Props> {
  render() {
    const {icon, children, title, onDismiss, screenshot} = this.props;
    return (
      <FlexRow fill={true}>
        <Containter>
          <TitleRow>
            {icon != null && (
              <Icon>
                <Glyph name={icon} size={24} color={colors.white} />
              </Icon>
            )}
            <Title>{title}</Title>
          </TitleRow>
          {children}
          <Button onClick={onDismiss}>Let's go</Button>
        </Containter>
        {screenshot != null && <Screenshot src={screenshot} />}
      </FlexRow>
    );
  }
}

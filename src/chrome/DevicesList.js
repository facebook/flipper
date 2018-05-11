/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  PureComponent,
  FlexRow,
  FlexBox,
  Text,
  Button,
  Popover,
  styled,
  colors,
} from 'sonar';

const Heading = Text.extends({
  display: 'block',
  backgroundColor: colors.white,
  color: colors.light30,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: '21px',
  padding: '4px 8px 0',
});

const PopoverItem = FlexRow.extends({
  alignItems: 'center',
  borderBottom: `1px solid ${colors.light05}`,
  height: 50,
  '&:last-child': {
    borderBottom: 'none',
  },
});

const ItemTitle = Text.extends({
  display: 'block',
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '120%',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  marginBottom: 1,
});

const ItemSubtitle = Text.extends({
  display: 'block',
  fontWeight: 400,
  fontSize: 11,
  color: colors.light30,
  lineHeight: '14px',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});

const ItemImage = FlexBox.extends({
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  flexShrink: 0,
});

const ItemContent = styled.view({
  minWidth: 0,
  paddingRight: 5,
  flexGrow: 1,
});

const Section = styled.view({
  maxWidth: 260,
  borderBottom: `1px solid ${colors.light05}`,
  '&:last-child': {
    borderBottom: 'none',
  },
});

const Action = Button.extends({
  border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
  background: 'transparent',
  color: colors.macOSTitleBarIconSelected,
  marginRight: 8,
  marginLeft: 4,
  lineHeight: '22px',
  '&:hover': {
    background: 'transparent',
  },
  '&:active': {
    background: 'transparent',
    border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
  },
});

type Props = {|
  sections: Array<{
    title: string,
    items: Array<{
      title: string,
      subtitle: string,
      onClick?: Function,
      icon?: React.Element<*>,
    }>,
  }>,
  onDismiss: Function,
|};

export default class DevicesList extends PureComponent<Props> {
  render() {
    return (
      <Popover onDismiss={this.props.onDismiss}>
        {this.props.sections.map(section => {
          if (section.items.length > 0) {
            return (
              <Section key={section.title}>
                <Heading>{section.title}</Heading>
                {section.items.map(item => (
                  <PopoverItem key={item.title}>
                    <ItemImage>{item.icon}</ItemImage>
                    <ItemContent>
                      <ItemTitle>{item.title}</ItemTitle>
                      <ItemSubtitle>{item.subtitle}</ItemSubtitle>
                    </ItemContent>
                    {item.onClick && (
                      <Action onClick={item.onClick} compact={true}>
                        Run
                      </Action>
                    )}
                  </PopoverItem>
                ))}
              </Section>
            );
          } else {
            return null;
          }
        })}
      </Popover>
    );
  }
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexColumn,
  FlexRow,
  FlexBox,
  Text,
  Button,
  styled,
  colors,
} from 'flipper';
import React, {PureComponent} from 'react';

const Anchor = styled.img({
  zIndex: 6,
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translate(-50%, calc(100% + 2px))',
});

const PopoverContainer = styled(FlexColumn)({
  backgroundColor: colors.white,
  borderRadius: 7,
  border: '1px solid rgba(0,0,0,0.3)',
  boxShadow: '0 2px 10px 0 rgba(0,0,0,0.3)',
  position: 'absolute',
  zIndex: 5,
  minWidth: 240,
  bottom: 0,
  marginTop: 15,
  left: '50%',
  transform: 'translate(-50%, calc(100% + 15px))',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    height: 13,
    top: -13,
    width: 26,
    backgroundColor: colors.white,
  },
});

const Heading = styled(Text)({
  display: 'block',
  backgroundColor: colors.white,
  color: colors.light30,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: '21px',
  padding: '4px 8px 0',
});

const PopoverItem = styled(FlexRow)({
  alignItems: 'center',
  borderBottom: `1px solid ${colors.light05}`,
  height: 50,
  '&:last-child': {
    borderBottom: 'none',
  },
});

const ItemTitle = styled(Text)({
  display: 'block',
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '120%',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  marginBottom: 1,
});

const ItemSubtitle = styled(Text)({
  display: 'block',
  fontWeight: 400,
  fontSize: 11,
  color: colors.light30,
  lineHeight: '14px',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});

const ItemImage = styled(FlexBox)({
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  flexShrink: 0,
});

const ItemContent = styled.div({
  minWidth: 0,
  paddingRight: 5,
  flexGrow: 1,
});

const Section = styled.div({
  borderBottom: `1px solid ${colors.light05}`,
  '&:last-child': {
    borderBottom: 'none',
  },
});

const Action = styled(Button)({
  border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
  background: 'transparent',
  color: colors.macOSTitleBarIconSelected,
  marginRight: 8,
  lineHeight: '22px',
  '&:hover': {
    background: 'transparent',
  },
  '&:active': {
    background: 'transparent',
    border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
  },
});

type Props = {
  sections: Array<{
    title: string;
    items: Array<{
      title: string;
      subtitle: string;
      onClick: (() => void) | null | undefined;
      icon: Element | null | undefined;
    }>;
  }>;
  onDismiss: Function;
};

export default class Popover extends PureComponent<Props> {
  _ref?: Element | null;

  componentDidMount() {
    window.document.addEventListener('click', this.handleClick);
  }

  componentWillUnmount() {
    window.document.addEventListener('click', this.handleClick);
  }

  handleClick = (e: MouseEvent) => {
    if (this._ref && !this._ref.contains(e.target as HTMLElement)) {
      this.props.onDismiss();
    }
  };

  _setRef = (ref: Element | null) => {
    this._ref = ref;
  };

  render() {
    return (
      <>
        <Anchor src="./anchor.svg" key="anchor" />
        <PopoverContainer ref={this._setRef} key="popup">
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
        </PopoverContainer>
      </>
    );
  }
}

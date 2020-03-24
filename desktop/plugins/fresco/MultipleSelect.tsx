/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Block, Button, colors, FlexColumn, styled, Glyph} from 'flipper';
import React, {ChangeEvent, Component} from 'react';

const Container = styled(Block)({
  position: 'relative',
  marginLeft: '10px',
});

const List = styled(FlexColumn)<{visibleList: boolean}>((props) => ({
  display: props.visibleList ? 'flex' : 'none',
  position: 'absolute',
  top: '32px',
  left: 0,
  zIndex: 4,
  width: 'auto',
  minWidth: '200px',
  backgroundColor: colors.white,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.macOSTitleBarButtonBorderBottom,
  borderRadius: 4,
}));

const ListItem = styled.label({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  color: colors.light50,
  fontSize: '11px',
  padding: '0 5px',
  '&:hover': {
    backgroundColor: colors.macOSTitleBarButtonBackgroundActiveHighlight,
  },
});

const Checkbox = styled.input({
  display: 'inline-block',
  marginRight: 5,
  verticalAlign: 'middle',
});

const StyledGlyph = styled(Glyph)({
  marginLeft: '4px',
});

type State = {
  visibleList: boolean;
};

export default class MultipleSelect extends Component<
  {
    selected: Set<string>;

    options: Set<string>;

    onChange: (selectedItem: string, checked: boolean) => void;

    label: string;
  },
  State
> {
  state = {
    visibleList: false,
  };

  handleOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const {
      target: {value, checked},
    } = event;
    this.props.onChange(value, checked);
  };

  toggleList = () => this.setState({visibleList: !this.state.visibleList});

  render() {
    const {selected, label, options} = this.props;
    const {visibleList} = this.state;
    const icon = visibleList ? 'chevron-up' : 'chevron-down';

    return (
      <Container>
        <Button onClick={this.toggleList}>
          {label} <StyledGlyph name={icon} />
        </Button>
        <List visibleList={visibleList}>
          {Array.from(options).map((option, index) => (
            <ListItem key={index}>
              <Checkbox
                onChange={this.handleOnChange}
                checked={selected.has(option)}
                value={option}
                type="checkbox"
              />
              {option}
            </ListItem>
          ))}
        </List>
      </Container>
    );
  }
}

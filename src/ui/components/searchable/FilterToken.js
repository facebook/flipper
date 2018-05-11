/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Filter} from 'sonar';
import {PureComponent} from 'react';
import Text from '../Text.js';
import styled from '../../styled/index.js';
import {findDOMNode} from 'react-dom';
import {colors} from '../colors.js';
import electron from 'electron';

const Token = Text.extends(
  {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: props =>
      props.focused
        ? colors.macOSHighlightActive
        : props.color || colors.macOSHighlight,
    borderRadius: 4,
    marginRight: 4,
    padding: 4,
    paddingLeft: 6,
    height: 21,
    color: props => (props.focused ? 'white' : 'inherit'),
    '&:active': {
      backgroundColor: colors.macOSHighlightActive,
      color: colors.white,
    },
    '&:first-of-type': {
      marginLeft: 3,
    },
  },
  {
    ignoreAttributes: ['focused', 'color'],
  },
);

const Key = Text.extends(
  {
    position: 'relative',
    fontWeight: 500,
    paddingRight: 12,
    textTransform: 'capitalize',
    lineHeight: '21px',
    '&:after': {
      content: props => (props.type === 'exclude' ? '"≠"' : '"="'),
      paddingLeft: 5,
      position: 'absolute',
      top: -1,
      right: 0,
      fontSize: 14,
    },
    '&:active:after': {
      backgroundColor: colors.macOSHighlightActive,
    },
  },
  {
    ignoreAttributes: ['type', 'focused'],
  },
);

const Value = Text.extends({
  whiteSpace: 'nowrap',
  maxWidth: 160,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: '21px',
  paddingLeft: 3,
});

const Chevron = styled.view(
  {
    border: 0,
    paddingLeft: 3,
    paddingRight: 1,
    marginRight: 0,
    fontSize: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    top: -2,
    height: 'auto',
    lineHeight: 'initial',
    color: props => (props.focused ? colors.white : 'inherit'),
    '&:hover, &:active, &:focus': {
      color: 'inherit',
      border: 0,
      backgroundColor: 'transparent',
    },
  },
  {
    ignoreAttributes: ['focused'],
  },
);

type Props = {|
  filter: Filter,
  focused: boolean,
  index: number,
  onFocus: (focusedToken: number) => void,
  onBlur: () => void,
  onDelete: (deletedToken: number) => void,
  onReplace: (index: number, filter: Filter) => void,
|};

export default class FilterToken extends PureComponent<Props> {
  _ref: ?Element;

  onMouseDown = () => {
    if (
      this.props.filter.persistent == null ||
      this.props.filter.persistent === false
    ) {
      this.props.onFocus(this.props.index);
    }
    this.showDetails();
  };

  showDetails = () => {
    const menuTemplate = [];

    if (this.props.filter.type === 'enum') {
      menuTemplate.push(
        ...this.props.filter.enum.map(({value, label}) => ({
          label,
          click: () => this.changeEnum(value),
          type: 'checkbox',
          checked: this.props.filter.value.indexOf(value) > -1,
        })),
      );
    } else {
      if (this.props.filter.value.length > 23) {
        menuTemplate.push(
          {
            label: this.props.filter.value,
            enabled: false,
          },
          {
            type: 'separator',
          },
        );
      }

      menuTemplate.push(
        {
          label:
            this.props.filter.type === 'include'
              ? `Entries excluding "${this.props.filter.value}"`
              : `Entries including "${this.props.filter.value}"`,
          click: this.toggleFilter,
        },
        {
          label: 'Remove this filter',
          click: () => this.props.onDelete(this.props.index),
        },
      );
    }
    const menu = electron.remote.Menu.buildFromTemplate(menuTemplate);
    const {bottom, left} = this._ref ? this._ref.getBoundingClientRect() : {};
    menu.popup(electron.remote.getCurrentWindow(), {
      async: true,
      x: parseInt(left, 10),
      y: parseInt(bottom, 10) + 8,
    });
  };

  toggleFilter = () => {
    const {filter, index} = this.props;
    if (filter.type !== 'enum') {
      const newFilter: Filter = {
        ...filter,
        type: filter.type === 'include' ? 'exclude' : 'include',
      };
      this.props.onReplace(index, newFilter);
    }
  };

  changeEnum = (newValue: string) => {
    const {filter, index} = this.props;
    if (filter.type === 'enum') {
      let {value} = filter;
      if (value.indexOf(newValue) > -1) {
        value = value.filter(v => v !== newValue);
      } else {
        value = value.concat([newValue]);
      }
      if (value.length === filter.enum.length) {
        value = [];
      }
      const newFilter: Filter = {
        type: 'enum',
        ...filter,
        value,
      };
      this.props.onReplace(index, newFilter);
    }
  };

  setRef = (ref: React.ElementRef<*>) => {
    const element = findDOMNode(ref);
    if (element instanceof HTMLElement) {
      this._ref = element;
    }
  };

  render() {
    const {filter} = this.props;
    let color;
    let value = '';

    if (filter.type === 'enum') {
      const getEnum = value => filter.enum.find(e => e.value === value);
      const firstValue = getEnum(filter.value[0]);
      const secondValue = getEnum(filter.value[1]);
      if (filter.value.length === 0) {
        value = 'All';
      } else if (filter.value.length === 2 && firstValue && secondValue) {
        value = `${firstValue.label} or ${secondValue.label}`;
      } else if (filter.value.length === 1 && firstValue) {
        value = firstValue.label;
        color = firstValue.color;
      } else if (firstValue) {
        value = `${firstValue.label} or ${filter.value.length - 1} others`;
      }
    } else {
      value = filter.value;
    }

    return (
      <Token
        key={`${filter.key}:${value}=${filter.type}`}
        tabIndex={-1}
        onMouseDown={this.onMouseDown}
        focused={this.props.focused}
        color={color}
        innerRef={this.setRef}>
        <Key type={this.props.filter.type} focused={this.props.focused}>
          {filter.key}
        </Key>
        <Value>{value}</Value>
        <Chevron tabIndex={-1} focused={this.props.focused}>
          &#8964;
        </Chevron>
      </Token>
    );
  }
}

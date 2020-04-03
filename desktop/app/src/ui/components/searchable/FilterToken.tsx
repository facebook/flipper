/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Filter} from '../filter/types';
import {PureComponent} from 'react';
import Text from '../Text';
import styled from '@emotion/styled';
import {colors} from '../colors';
import electron, {MenuItemConstructorOptions} from 'electron';
import React from 'react';
import {ColorProperty} from 'csstype';

const Token = styled(Text)<{focused?: boolean; color?: ColorProperty}>(
  (props) => ({
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: props.focused
      ? colors.macOSHighlightActive
      : props.color || colors.macOSHighlight,
    borderRadius: 4,
    marginRight: 4,
    padding: 4,
    paddingLeft: 6,
    height: 21,
    color: props.focused ? 'white' : 'inherit',
    '&:active': {
      backgroundColor: colors.macOSHighlightActive,
      color: colors.white,
    },
    '&:first-of-type': {
      marginLeft: 3,
    },
  }),
);
Token.displayName = 'FilterToken:Token';

const Key = styled(Text)<{
  type: 'exclude' | 'include' | 'enum';
  focused?: boolean;
}>((props) => ({
  position: 'relative',
  fontWeight: 500,
  paddingRight: 12,
  textTransform: 'capitalize',
  lineHeight: '21px',
  '&:after': {
    content: props.type === 'exclude' ? '"≠"' : '"="',
    paddingLeft: 5,
    position: 'absolute',
    top: -1,
    right: 0,
    fontSize: 14,
  },
  '&:active:after': {
    backgroundColor: colors.macOSHighlightActive,
  },
}));
Key.displayName = 'FilterToken:Key';

const Value = styled(Text)({
  whiteSpace: 'nowrap',
  maxWidth: 160,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: '21px',
  paddingLeft: 3,
});
Value.displayName = 'FilterToken:Value';

const Chevron = styled.div<{focused?: boolean}>((props) => ({
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
  color: props.focused ? colors.white : 'inherit',
  '&:hover, &:active, &:focus': {
    color: 'inherit',
    border: 0,
    backgroundColor: 'transparent',
  },
}));
Chevron.displayName = 'FilterToken:Chevron';

type Props = {
  filter: Filter;
  focused: boolean;
  index: number;
  onFocus: (focusedToken: number) => void;
  onBlur: () => void;
  onDelete: (deletedToken: number) => void;
  onReplace: (index: number, filter: Filter) => void;
};

export default class FilterToken extends PureComponent<Props> {
  _ref?: Element | null;

  onMouseDown = () => {
    if (
      this.props.filter.type !== 'enum' ||
      this.props.filter.persistent == null ||
      this.props.filter.persistent === false
    ) {
      this.props.onFocus(this.props.index);
    }
    this.showDetails();
  };

  showDetails = () => {
    const menuTemplate: Array<MenuItemConstructorOptions> = [];

    if (this.props.filter.type === 'enum') {
      menuTemplate.push(
        ...this.props.filter.enum.map(({value, label}) => ({
          label,
          click: () => this.changeEnum(value),
          type: 'checkbox' as 'checkbox',
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
    if (this._ref) {
      const {bottom, left} = this._ref.getBoundingClientRect();

      menu.popup({
        window: electron.remote.getCurrentWindow(),
        // @ts-ignore: async is private API
        async: true,
        // Note: Electron requires the x/y parameters to be integer values for marshalling
        x: Math.round(left),
        y: Math.round(bottom + 8),
      });
    }
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
        value = value.filter((v) => v !== newValue);
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

  setRef = (ref: HTMLSpanElement | null) => {
    this._ref = ref;
  };

  render() {
    const {filter} = this.props;
    let color;
    let value = '';

    if (filter.type === 'enum') {
      const getEnum = (value: string) =>
        filter.enum.find((e) => e.value === value);
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
        ref={this.setRef}>
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

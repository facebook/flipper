/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Filter} from './types';
import React, {PureComponent} from 'react';
import ContextMenu from '../ContextMenu';
import textContent from '../../../utils/textContent';
import styled from '@emotion/styled';
import {colors} from '../colors';

const FilterText = styled.div({
  display: 'flex',
  alignSelf: 'baseline',
  userSelect: 'none',
  cursor: 'pointer',
  position: 'relative',
  maxWidth: '100%',
  '&:hover': {
    color: colors.white,
    zIndex: 2,
  },
  '&:hover::after': {
    content: '""',
    position: 'absolute',
    top: 2,
    bottom: 1,
    left: -6,
    right: -6,
    borderRadius: '999em',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: -1,
  },
  '&:hover *': {
    color: `${colors.white} !important`,
  },
});
FilterText.displayName = 'FilterRow:FilterText';

type Props = {
  children: React.ReactNode;
  addFilter: (filter: Filter) => void;
  filterKey: string;
};

export default class FilterRow extends PureComponent<Props> {
  onClick = (e: React.MouseEvent) => {
    if (e.button === 0) {
      this.props.addFilter({
        type: e.metaKey || e.altKey ? 'exclude' : 'include',
        key: this.props.filterKey,
        value: textContent(this.props.children),
      });
    }
  };

  menuItems = [
    {
      label: 'Filter this value',
      click: () =>
        this.props.addFilter({
          type: 'include',
          key: this.props.filterKey,
          value: textContent(this.props.children),
        }),
    },
  ];

  render() {
    const {children, ...props} = this.props;

    return (
      <ContextMenu
        items={this.menuItems}
        component={FilterText}
        onMouseDown={this.onClick}
        {...props}>
        {children}
      </ContextMenu>
    );
  }
}

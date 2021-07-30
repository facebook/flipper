/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Glyph, styled} from 'flipper';
import {useItemNavigation} from '../hooks/autoCompleteSheet';
import {filterProvidersToLineItems} from '../util/autoCompleteProvider';
import {AutoCompleteProvider, AutoCompleteLineItem, URI} from '../types';
import React from 'react';

type Props = {
  providers: Array<AutoCompleteProvider>;
  onHighlighted: (uri: URI) => void;
  onNavigate: (uri: URI) => void;
  query: string;
};

const MAX_ITEMS = 5;

const AutoCompleteSheetContainer = styled.div({
  width: '100%',
  position: 'absolute',
  top: 'calc(100% - 3px)',
  backgroundColor: 'white',
  zIndex: 1,
  borderBottomRightRadius: 10,
  borderBottomLeftRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
});

const SheetItem = styled.div({
  padding: 5,
  textOverflow: 'ellipsis',
  overflowX: 'hidden',
  whiteSpace: 'nowrap',
  '&.selected': {
    backgroundColor: 'rgba(155, 155, 155, 0.2)',
  },
  '&:hover': {
    backgroundColor: 'rgba(155, 155, 155, 0.2)',
  },
});

const SheetItemIcon = styled.span({
  padding: 8,
});

export function AutoCompleteSheet(props: Props) {
  const {providers, onHighlighted, onNavigate, query} = props;
  const lineItems = filterProvidersToLineItems(providers, query, MAX_ITEMS);
  lineItems.unshift({uri: query, matchPattern: query, icon: 'send'});
  const selectedItem = useItemNavigation(lineItems, onHighlighted);
  return (
    <AutoCompleteSheetContainer>
      {lineItems.map((lineItem: AutoCompleteLineItem, idx: number) => (
        <SheetItem
          className={idx === selectedItem ? 'selected' : ''}
          key={idx}
          onMouseDown={() => onNavigate(lineItem.uri)}>
          <SheetItemIcon>
            <Glyph name={lineItem.icon} size={16} variant="outline" />
          </SheetItemIcon>
          {lineItem.matchPattern}
        </SheetItem>
      ))}
    </AutoCompleteSheetContainer>
  );
}

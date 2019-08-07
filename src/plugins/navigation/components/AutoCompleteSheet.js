/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {Glyph, styled} from 'flipper';
import {useItemNavigation} from '../hooks/autoCompleteSheet';
import {filterProvidersToLineItems} from '../util/autoCompleteProvider';

import type {AutoCompleteProvider} from '../flow-types';

type Props = {|
  providers: Array<AutoCompleteProvider>,
  onHighlighted: string => void,
  onNavigate: string => void,
  query: string,
|};

const MAX_ITEMS = 5;

const AutoCompleteSheetContainer = styled('div')({
  width: '100%',
  position: 'absolute',
  top: '100%',
  backgroundColor: 'white',
  zIndex: 1,
  borderBottomRightRadius: 10,
  borderBottomLeftRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
});

const SheetItem = styled('div')({
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

const SheetItemIcon = styled('span')({
  padding: 8,
});

export default (props: Props) => {
  const {providers, onHighlighted, onNavigate, query} = props;
  const lineItems = filterProvidersToLineItems(providers, query, MAX_ITEMS);
  lineItems.unshift({uri: query, matchPattern: query, icon: 'send'});
  const selectedItem = useItemNavigation(lineItems, onHighlighted);
  return (
    <AutoCompleteSheetContainer>
      {lineItems.map((lineItem, idx) => (
        <SheetItem
          className={idx === selectedItem ? 'selected' : null}
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
};

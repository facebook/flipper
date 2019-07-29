/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {styled} from 'flipper';
import {useEffect, useState} from 'react';

import type {Bookmark} from '../flow-types';

type Props = {|
  bookmarks: Map<string, Bookmark>,
  onHighlighted: string => void,
  onNavigate: string => void,
|};

const MAX_ITEMS = 5;

const AutoCompleteSheetContainer = styled('div')({
  width: '100%',
  overflowY: 'scroll',
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

// Menu Item Navigation Hook
const useItemNavigation = (
  bookmarks: Array<Bookmark>,
  onHighlighted: string => void,
) => {
  const [selectedItem, setSelectedItem] = useState(-1);

  const handleKeyPress = ({key}) => {
    switch (key) {
      case 'ArrowDown': {
        const newSelectedItem =
          selectedItem < MAX_ITEMS - 1 ? selectedItem + 1 : selectedItem;
        setSelectedItem(newSelectedItem);
        onHighlighted(bookmarks[newSelectedItem].uri);
        break;
      }
      case 'ArrowUp': {
        const newSelectedItem =
          selectedItem > 0 ? selectedItem - 1 : selectedItem;
        setSelectedItem(newSelectedItem);
        onHighlighted(bookmarks[newSelectedItem].uri);
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  });

  return selectedItem;
};

export default (props: Props) => {
  const {bookmarks, onHighlighted, onNavigate} = props;
  const filteredBookmarks = [...bookmarks.values()].slice(0, MAX_ITEMS);
  const selectedItem = useItemNavigation(filteredBookmarks, onHighlighted);
  return (
    <AutoCompleteSheetContainer>
      {filteredBookmarks.map((bookmark, idx) => (
        <SheetItem
          className={idx === selectedItem ? 'selected' : null}
          key={bookmark.uri}
          onMouseDown={() => onNavigate(bookmark.uri)}>
          {bookmark.uri}
        </SheetItem>
      ))}
    </AutoCompleteSheetContainer>
  );
};

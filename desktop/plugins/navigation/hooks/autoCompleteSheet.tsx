/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect, useState} from 'react';
import {AutoCompleteLineItem} from '../types';

export const useItemNavigation = (
  lineItems: Array<AutoCompleteLineItem>,
  onHighlighted: (uri: string) => void,
) => {
  const [selectedItem, setSelectedItem] = useState(0);

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown': {
        const newSelectedItem =
          selectedItem < lineItems.length - 1
            ? selectedItem + 1
            : lineItems.length - 1;
        setSelectedItem(newSelectedItem);
        onHighlighted(lineItems[newSelectedItem].uri);
        break;
      }
      case 'ArrowUp': {
        const newSelectedItem =
          selectedItem > 0 ? selectedItem - 1 : selectedItem;
        setSelectedItem(newSelectedItem);
        onHighlighted(lineItems[newSelectedItem].uri);
        break;
      }
      default: {
        setSelectedItem(0);
        break;
      }
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

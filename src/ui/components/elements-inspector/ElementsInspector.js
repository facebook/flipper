/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import FlexRow from '../FlexRow.js';
import {Elements} from './elements.js';
import type {ContextMenuExtension} from 'flipper';

export type ElementID = string;

export type ElementSearchResultSet = {|
  query: string,
  matches: Set<ElementID>,
|};

export type ElementData = {
  [name: ElementID]: {
    [key: string]:
      | string
      | number
      | boolean
      | {|
          __type__: string,
          value: any,
        |},
  },
};

export type ElementAttribute = {|
  name: string,
  value: string,
|};

export type ElementExtraInfo = {|
  nonAXWithAXChild?: boolean,
  linkedAXNode?: string,
  focused?: boolean,
|};

export type Element = {|
  id: ElementID,
  name: string,
  expanded: boolean,
  children: Array<ElementID>,
  attributes: Array<ElementAttribute>,
  data: ElementData,
  decoration: string,
  extraInfo: ElementExtraInfo,
|};

export default class ElementsInspector extends Component<{
  onElementExpanded: (key: ElementID, deep: boolean) => void,
  onElementSelected: (key: ElementID) => void,
  onElementHovered: ?(key: ?ElementID) => void,
  onValueChanged: ?(path: Array<string>, val: any) => void,
  selected: ?ElementID,
  focused?: ?ElementID,
  searchResults?: ?ElementSearchResultSet,
  root: ?ElementID,
  elements: {[key: ElementID]: Element},
  useAppSidebar?: boolean,
  alternateRowColor?: boolean,
  contextMenuExtensions?: Array<ContextMenuExtension>,
}> {
  static defaultProps = {
    alternateRowColor: true,
  };
  render() {
    const {
      selected,
      focused,
      elements,
      root,
      onElementExpanded,
      onElementSelected,
      onElementHovered,
      searchResults,
      alternateRowColor,
      contextMenuExtensions,
    } = this.props;

    return (
      <FlexRow grow={true}>
        <Elements
          onElementExpanded={onElementExpanded}
          onElementSelected={onElementSelected}
          onElementHovered={onElementHovered}
          selected={selected}
          focused={focused}
          searchResults={searchResults}
          root={root}
          elements={elements}
          alternateRowColor={alternateRowColor}
          contextMenuExtensions={contextMenuExtensions}
        />
      </FlexRow>
    );
  }
}

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import FlexRow from '../FlexRow.js';
import {Elements} from './elements.js';

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

export type Element = {|
  id: ElementID,
  name: string,
  expanded: boolean,
  children: Array<ElementID>,
  attributes: Array<ElementAttribute>,
  data: ElementData,
  decoration: string,
|};

export default class ElementsInspector extends Component<{
  onElementExpanded: (key: ElementID, deep: boolean) => void,
  onElementSelected: (key: ElementID) => void,
  onElementHovered: ?(key: ?ElementID) => void,
  onValueChanged: ?(path: Array<string>, val: any) => void,
  selected: ?ElementID,
  searchResults?: ?ElementSearchResultSet,
  root: ?ElementID,
  elements: {[key: ElementID]: Element},
  useAppSidebar?: boolean,
}> {
  render() {
    const {
      selected,
      elements,
      root,
      onElementExpanded,
      onElementSelected,
      onElementHovered,
      searchResults,
    } = this.props;

    return (
      <FlexRow fill={true}>
        <Elements
          onElementExpanded={onElementExpanded}
          onElementSelected={onElementSelected}
          onElementHovered={onElementHovered}
          selected={selected}
          searchResults={searchResults}
          root={root}
          elements={elements}
        />
      </FlexRow>
    );
  }
}

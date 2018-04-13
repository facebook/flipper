/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import {Component} from 'react';
import FlexRow from '../FlexRow.js';
import {Elements} from './elements.js';

export type ElementID = string;

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
    } = this.props;

    return (
      <FlexRow fill={true}>
        <Elements
          onElementExpanded={onElementExpanded}
          onElementSelected={onElementSelected}
          onElementHovered={onElementHovered}
          selected={selected}
          root={root}
          elements={elements}
        />
      </FlexRow>
    );
  }
}

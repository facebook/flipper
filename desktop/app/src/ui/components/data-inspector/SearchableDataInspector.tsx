/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import debounceRender from 'react-debounce-render';

import {DataInspector} from 'flipper-plugin';
import Searchable, {SearchableProps} from '../searchable/Searchable';

type ManagedDataInspectorProps = any; // TODO!

type Props = ManagedDataInspectorProps & SearchableProps;

function filter(data: any, searchTerm: string): any {
  if (searchTerm === '') {
    return data;
  }
  const res: any = {};
  const lowerSearch = searchTerm.toLowerCase();

  for (const key in data) {
    if (key.toLowerCase().indexOf(lowerSearch) != -1) {
      res[key] = data[key];
    }
  }
  return res;
}

// Naive shallow filters matching wrapper for ManagedDataInspector
function SearchableDataInspector(props: Props) {
  return (
    <DataInspector {...props} data={filter(props.data, props.searchTerm)} />
  );
}

export default Searchable(debounceRender(SearchableDataInspector, 250, {}));

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {DataTable, DataTableColumn} from 'flipper-plugin';
import {useCallback} from 'react';

export type KeyValueItem = {
  key: string;
  value: string;
};

const columns: DataTableColumn<KeyValueItem>[] = [
  {
    key: 'key',
    width: 160,
    title: 'Key',
  },
  {
    key: 'value',
    title: 'Value',
    wrap: true,
  },
];

export function KeyValueTable({items}: {items: KeyValueItem[]}) {
  const handleCopyRows = useCallback((rows: KeyValueItem[]) => {
    return rows.map(({key, value}) => `${key}: ${value}`).join('\n');
  }, []);

  return (
    <DataTable<KeyValueItem>
      columns={columns}
      records={items}
      enableSearchbar={false}
      scrollable={false}
      onCopyRows={handleCopyRows}
    />
  );
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {DataTable, DataTableColumn} from '../DataTable';
import {render} from '@testing-library/react';

type Todo = {
  title: string;
  done: boolean;
};

function createTestRecords(): Todo[] {
  return [
    {
      title: 'test DataTable',
      done: true,
    },
  ];
}

const columns: DataTableColumn[] = [
  {
    key: 'title',
    wrap: false,
  },
  {
    key: 'done',
    wrap: false,
  },
];

test('update and append', async () => {
  let records = createTestRecords();
  const rendering = render(<DataTable records={records} columns={columns} />);
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-9bipfg-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          test DataTable
        </div>
        <div
          class="css-9bipfg-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          true
        </div>
      </div>
    `);
  }

  function rerender() {
    rendering.rerender(<DataTable records={records} columns={columns} />);
  }

  // append
  {
    records = [
      ...records,
      {
        title: 'Drink coffee',
        done: false,
      },
    ];
    rerender();
    const elem = await rendering.findAllByText('Drink coffee');
    expect(elem.length).toBe(1);
  }

  // update
  {
    records = [
      {
        title: 'DataTable tested',
        done: false,
      },
      ...records.slice(1),
    ];
    rerender();
    const elem = await rendering.findAllByText('DataTable tested');
    expect(elem.length).toBe(1);
    expect(rendering.queryByText('test DataTable')).toBeNull();
  }

  // remove
  {
    records = [records[1]];
    rerender();
    const elem = await rendering.findAllByText('Drink coffee');
    expect(elem.length).toBe(1);
    expect(rendering.queryByText('DataTable tested')).toBeNull();
  }
});

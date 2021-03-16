/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {createRef} from 'react';
import {DataTable, DataTableColumn} from '../DataTable';
import {render, act} from '@testing-library/react';
import {createDataSource} from '../../../state/datasource/DataSource';
import {TableManager} from '../useDataTableManager';

type Todo = {
  title: string;
  done: boolean;
};

function createTestDataSource() {
  return createDataSource<Todo>([
    {
      title: 'test DataTable',
      done: true,
    },
  ]);
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
  const ds = createTestDataSource();
  const ref = createRef<TableManager>();
  const rendering = render(
    <DataTable dataSource={ds} columns={columns} tableManagerRef={ref} />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement).toMatchInlineSnapshot(`
        <div
          class="ant-table-row css-4f2ebr-TableBodyRowContainer efe0za01"
        >
          <div
            class="ant-table-cell css-1g4z4wd-TableBodyColumnContainer efe0za00"
          >
            test DataTable
          </div>
          <div
            class="ant-table-cell css-1g4z4wd-TableBodyColumnContainer efe0za00"
          >
            true
          </div>
        </div>
      `);
  }

  act(() => {
    ds.append({
      title: 'Drink coffee',
      done: false,
    });
  });
  {
    const elem = await rendering.findAllByText('Drink coffee');
    expect(elem.length).toBe(1);
  }

  // update
  act(() => {
    ds.update(0, {
      title: 'DataTable tested',
      done: false,
    });
  });
  {
    const elem = await rendering.findAllByText('DataTable tested');
    expect(elem.length).toBe(1);
    expect(rendering.queryByText('test DataTable')).toBeNull();
  }
});

test('column visibility', async () => {
  const ds = createTestDataSource();
  const ref = createRef<TableManager>();
  const rendering = render(
    <DataTable dataSource={ds} columns={columns} tableManagerRef={ref} />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-table-row css-4f2ebr-TableBodyRowContainer efe0za01"
      >
        <div
          class="ant-table-cell css-1g4z4wd-TableBodyColumnContainer efe0za00"
        >
          test DataTable
        </div>
        <div
          class="ant-table-cell css-1g4z4wd-TableBodyColumnContainer efe0za00"
        >
          true
        </div>
      </div>
    `);
  }

  // hide done
  act(() => {
    ref.current?.toggleColumnVisibility('done');
  });
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-table-row css-4f2ebr-TableBodyRowContainer efe0za01"
      >
        <div
          class="ant-table-cell css-1g4z4wd-TableBodyColumnContainer efe0za00"
        >
          test DataTable
        </div>
      </div>
    `);
  }

  // reset
  act(() => {
    ref.current?.reset();
  });
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement?.children.length).toBe(2);
  }
});

test('sorting', async () => {
  const ds = createTestDataSource();
  ds.clear();
  ds.append({
    title: 'item a',
    done: false,
  });
  ds.append({
    title: 'item x',
    done: false,
  });
  ds.append({
    title: 'item b',
    done: false,
  });
  const ref = createRef<TableManager>();
  const rendering = render(
    <DataTable
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
      _testHeight={400}
    />,
  );
  // insertion order
  {
    const elem = await rendering.findAllByText(/item/);
    expect(elem.length).toBe(3);
    expect(elem.map((e) => e.textContent)).toEqual([
      'item a',
      'item x',
      'item b',
    ]);
  }
  // sort asc
  act(() => {
    ref.current?.sortColumn('title');
  });
  {
    const elem = await rendering.findAllByText(/item/);
    expect(elem.length).toBe(3);
    expect(elem.map((e) => e.textContent)).toEqual([
      'item a',
      'item b',
      'item x',
    ]);
  }
  // sort desc
  act(() => {
    ref.current?.sortColumn('title');
  });
  {
    const elem = await rendering.findAllByText(/item/);
    expect(elem.length).toBe(3);
    expect(elem.map((e) => e.textContent)).toEqual([
      'item x',
      'item b',
      'item a',
    ]);
  }
  // another click resets again
  act(() => {
    ref.current?.sortColumn('title');
  });
  {
    const elem = await rendering.findAllByText(/item/);
    expect(elem.length).toBe(3);
    expect(elem.map((e) => e.textContent)).toEqual([
      'item a',
      'item x',
      'item b',
    ]);
  }
});

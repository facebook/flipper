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
import {createDataSource} from '../../../state/DataSource';
import {computeDataTableFilter, DataTableManager} from '../DataTableManager';
import {Button} from 'antd';

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
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
      _testHeight={400}
    />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement).toMatchInlineSnapshot(`
      <div
        class="css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-esqhnb-TableBodyColumnContainer e1luu51r0"
        >
          test DataTable
        </div>
        <div
          class="css-esqhnb-TableBodyColumnContainer e1luu51r0"
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
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
      _testHeight={400}
    />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement).toMatchInlineSnapshot(`
      <div
        class="css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-esqhnb-TableBodyColumnContainer e1luu51r0"
        >
          test DataTable
        </div>
        <div
          class="css-esqhnb-TableBodyColumnContainer e1luu51r0"
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
        class="css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-esqhnb-TableBodyColumnContainer e1luu51r0"
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
  const ref = createRef<DataTableManager<Todo>>();
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
    ref.current?.sortColumn('title', 'asc');
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
    ref.current?.sortColumn('title', 'desc');
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
  // reset sort
  act(() => {
    ref.current?.sortColumn('title', undefined);
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

test('search', async () => {
  const ds = createTestDataSource();
  ds.clear();
  ds.append({
    title: 'item abc',
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
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
      extraActions={<Button>Test Button</Button>}
      _testHeight={400}
    />,
  );
  {
    // button is visible
    rendering.getByText('Test Button');
    const elem = await rendering.findAllByText(/item/);
    expect(elem.length).toBe(3);
    expect(elem.map((e) => e.textContent)).toEqual([
      'item abc',
      'item x',
      'item b',
    ]);
  }
  {
    // filter
    act(() => {
      ref.current?.setSearchValue('b');
    });
    const elem = await rendering.findAllByText(/item/);
    expect(elem.map((e) => e.textContent)).toEqual(['item abc', 'item b']);
  }
  {
    // reset
    act(() => {
      ref.current?.reset();
    });
    const elem = await rendering.findAllByText(/item/);
    expect(elem.length).toBe(3);
  }
});

test('compute filters', () => {
  const coffee = {
    level: 'info',
    title: 'Drink coffee',
    done: true,
  };
  const espresso = {
    level: 'info',
    title: 'Make espresso',
    done: false,
  };
  const meet = {
    level: 'error',
    title: 'Meet me',
    done: false,
  };
  const data = [coffee, espresso, meet];

  // results in empty filter
  expect(computeDataTableFilter('', false, [])).toBeUndefined();
  expect(
    computeDataTableFilter('', false, [
      {
        key: 'title',
        filters: [
          {
            enabled: false,
            value: 'coffee',
            label: 'coffee',
          },
        ],
      },
    ]),
  ).toBeUndefined();

  {
    const filter = computeDataTableFilter('tEsT', false, [])!;
    expect(data.filter(filter)).toEqual([]);
  }

  {
    const filter = computeDataTableFilter('EE', false, [])!;
    expect(data.filter(filter)).toEqual([coffee, meet]);
  }

  {
    const filter = computeDataTableFilter('D', false, [])!;
    expect(data.filter(filter)).toEqual([coffee]);
  }

  {
    // regex, positive (mind the double escaping of \\b)
    const filter = computeDataTableFilter('..t', true, [])!;
    expect(data.filter(filter)).toEqual([meet]);
  }
  {
    // regex, words with 6 chars
    const filter = computeDataTableFilter('\\w{6}', true, [])!;
    expect(data.filter(filter)).toEqual([coffee, espresso]);
  }
  {
    // no match
    const filter = computeDataTableFilter('\\w{18}', true, [])!;
    expect(data.filter(filter)).toEqual([]);
  }
  {
    // invalid regex
    const filter = computeDataTableFilter('bla/[', true, [])!;
    expect(data.filter(filter)).toEqual([]);
  }
  {
    const filter = computeDataTableFilter('true', false, [])!;
    expect(data.filter(filter)).toEqual([coffee]);
  }

  {
    const filter = computeDataTableFilter('false', false, [])!;
    expect(data.filter(filter)).toEqual([espresso, meet]);
  }

  {
    const filter = computeDataTableFilter('EE', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'error',
            label: 'error',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([meet]);
  }
  {
    const filter = computeDataTableFilter('EE', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'info',
            label: 'info',
          },
          {
            enabled: true,
            value: 'error',
            label: 'error',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([coffee, meet]);
  }
  {
    const filter = computeDataTableFilter('', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'info',
            label: 'info',
          },
          {
            enabled: false,
            value: 'error',
            label: 'error',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([coffee, espresso]);
  }
  {
    const filter = computeDataTableFilter('', false, [
      {
        key: 'done',
        filters: [
          {
            enabled: true,
            value: 'false',
            label: 'Not done',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([espresso, meet]);
  }
  {
    // nothing selected anything will not filter anything out for that column
    const filter = computeDataTableFilter('', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: false,
            value: 'info',
            label: 'info',
          },
          {
            enabled: false,
            value: 'error',
            label: 'error',
          },
        ],
      },
    ])!;
    expect(filter).toBeUndefined();
  }
  {
    const filter = computeDataTableFilter('', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'info',
            label: 'info',
          },
          {
            enabled: true,
            value: 'error',
            label: 'error',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([coffee, espresso, meet]);
  }
  {
    const filter = computeDataTableFilter('', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'info',
            label: 'info',
          },
        ],
      },
      {
        key: 'done',
        filters: [
          {
            enabled: true,
            value: 'false',
            label: 'false,',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([espresso]);
  }
  {
    const filter = computeDataTableFilter('nonsense', false, [
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'info',
            label: 'info',
          },
        ],
      },
      {
        key: 'done',
        filters: [
          {
            enabled: true,
            value: 'false',
            label: 'false,',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([]);
  }
});

test('onSelect callback fires, and in order', () => {
  const events: any[] = [];
  const ds = createTestDataSource();
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
      _testHeight={400}
      onSelect={(item, items) => {
        events.push([item, items]);
      }}
    />,
  );

  const item1 = {
    title: 'item 1',
    done: false,
  };
  const item2 = {
    title: 'item 2',
    done: false,
  };
  const item3 = {
    title: 'item 3',
    done: false,
  };
  act(() => {
    ds.clear();
    ds.append(item1);
    ds.append(item2);
    ds.append(item3);
    ref.current!.selectItem(2);
  });

  expect(events.splice(0)).toEqual([
    [undefined, []],
    [item3, [item3]],
  ]);

  act(() => {
    ref.current!.addRangeToSelection(0, 0);
  });

  expect(events.splice(0)).toEqual([
    [item1, [item1, item3]], // order preserved!
  ]);

  rendering.unmount();
});

test('selection always has the latest state', () => {
  const events: any[] = [];
  const ds = createTestDataSource();
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
      _testHeight={400}
      onSelect={(item, items) => {
        events.push([item, items]);
      }}
    />,
  );

  const item1 = {
    title: 'item 1',
    done: false,
  };
  const item2 = {
    title: 'item 2',
    done: false,
  };
  const item3 = {
    title: 'item 3',
    done: false,
  };
  act(() => {
    ds.clear();
    ds.append(item1);
    ds.append(item2);
    ds.append(item3);
    ref.current!.selectItem(2);
  });

  expect(events.splice(0)).toEqual([
    [undefined, []],
    [item3, [item3]],
  ]);

  const item3updated = {
    title: 'item 3 updated',
    done: false,
  };
  act(() => {
    ds.update(2, item3updated);
  });
  act(() => {
    ref.current!.addRangeToSelection(0, 0);
  });

  expect(events.splice(0)).toEqual([
    [item1, [item1, item3updated]], // update reflected in callback!
  ]);

  rendering.unmount();
});

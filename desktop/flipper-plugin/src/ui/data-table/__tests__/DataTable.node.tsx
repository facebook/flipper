/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {createRef} from 'react';
import {DataTable, DataTableColumn} from '../DataTable';
import {render, act} from '@testing-library/react';
import {computeDataTableFilter, DataTableManager} from '../DataTableManager';
import {Button} from 'antd';
import {sleep} from 'flipper-common';
import {setFlipperLibImplementation} from '../../../plugin/FlipperLib';
import {createMockFlipperLib} from '../../../test-utils/test-utils';
import {createDataSource} from '../../../data-source/index';

type Todo = {
  title: string;
  done: boolean;
};

setFlipperLibImplementation(createMockFlipperLib());

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
    <DataTable dataSource={ds} columns={columns} tableManagerRef={ref} />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
        </div>
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            true
          </span>
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
    <DataTable dataSource={ds} columns={columns} tableManagerRef={ref} />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
        </div>
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            true
          </span>
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
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
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
    expect(elem[0].parentElement?.parentElement?.children.length).toBe(2);
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
    <DataTable dataSource={ds} columns={columns} tableManagerRef={ref} />,
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
    await sleep(100); // Needed due to internal scheduling change in react-virtual
    const elem = await rendering.findAllByText(/item/);
    expect(elem.map((e) => e.textContent)).toEqual([
      'item abc',
      'item x',
      'item b',
    ]);
    expect(elem.length).toBe(3);
  }
});

test('compute filters', () => {
  const levelCol = {key: 'level'};
  const titleCol = {key: 'title'};
  const doneCol = {key: 'done'};
  const baseColumns = [levelCol, titleCol, doneCol];

  const coffee = {
    level: 'info',
    title: 'Drink coffee',
    done: true,
    extras: {
      comment: 'tasty',
    },
  };
  const espresso = {
    level: 'info',
    title: 'Make espresso',
    done: false,
    extras: {
      comment: 'dull',
    },
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
    const filter = computeDataTableFilter('tEsT', false, baseColumns)!;
    expect(data.filter(filter)).toEqual([]);
  }
  {
    //no columns but should still find rows
    const filter = computeDataTableFilter('EE', false, [])!;
    expect(data.filter(filter)).toEqual([coffee, meet]);
  }
  {
    const filter = computeDataTableFilter('EE', false, baseColumns)!;
    expect(data.filter(filter)).toEqual([coffee, meet]);
  }

  {
    const filter = computeDataTableFilter('D', false, baseColumns)!;
    expect(data.filter(filter)).toEqual([coffee]);
  }

  const commentCol = {key: 'extras.comment'};
  {
    // free search on value tasty in nested column
    const filter = computeDataTableFilter('tasty', false, [
      ...baseColumns,
      commentCol,
    ])!;
    expect(data.filter(filter)).toEqual([coffee]);
  }

  {
    // regex, positive (mind the double escaping of \\b)
    const filter = computeDataTableFilter('..t', true, baseColumns)!;
    expect(data.filter(filter)).toEqual([meet]);
  }
  {
    // regex, words with 6 chars
    const filter = computeDataTableFilter('\\w{6}', true, baseColumns)!;
    expect(data.filter(filter)).toEqual([coffee, espresso]);
  }
  {
    // no match
    const filter = computeDataTableFilter('\\w{18}', true, baseColumns)!;
    expect(data.filter(filter)).toEqual([]);
  }
  {
    // invalid regex
    const filter = computeDataTableFilter('bla/[', true, baseColumns)!;
    expect(data.filter(filter)).toEqual([]);
  }
  {
    const filter = computeDataTableFilter('true', false, baseColumns)!;
    expect(data.filter(filter)).toEqual([coffee]);
  }

  {
    const filter = computeDataTableFilter('false', false, baseColumns)!;
    expect(data.filter(filter)).toEqual([espresso, meet]);
  }

  {
    const filter = computeDataTableFilter('EE', false, [
      levelCol,
      titleCol,
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
      doneCol,
      titleCol,
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
      doneCol,
      titleCol,
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
      levelCol,
      titleCol,
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
      doneCol,
      titleCol,
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
    //nested filter on comment
    const filter = computeDataTableFilter('', false, [
      ...baseColumns,
      {
        key: 'extras.comment',
        filters: [
          {
            enabled: true,
            value: 'dull',
            label: 'dull',
          },
        ],
      },
    ])!;
    expect(data.filter(filter)).toEqual([espresso]);
  }

  {
    //filter 'level' on values info and error which will match all records
    const filter = computeDataTableFilter('', false, [
      doneCol,
      titleCol,
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
      titleCol,
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
    // inverse filter
    const filter = computeDataTableFilter('', false, [
      doneCol,
      titleCol,
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'error',
            label: 'error',
          },
        ],
        inversed: true,
      },
    ])!;
    expect(data.filter(filter)).toEqual([coffee, espresso]);
  }
  {
    // inverse filter with search
    const filter = computeDataTableFilter('coffee', false, [
      doneCol,
      titleCol,
      {
        key: 'level',
        filters: [
          {
            enabled: true,
            value: 'error',
            label: 'error',
          },
        ],
        inversed: true,
      },
    ])!;
    expect(data.filter(filter)).toEqual([coffee]);
  }
  {
    const filter = computeDataTableFilter('nonsense', false, [
      titleCol,
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

  expect(events.splice(0)).toEqual([[item3, [item3]]]);

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

  expect(events.splice(0)).toEqual([[item3, [item3]]]);

  const item3updated = {
    title: 'item 3 updated',
    done: false,
  };
  act(() => {
    ds.update(2, item3updated);
  });
  expect(events.splice(0)).toEqual([[item3updated, [item3updated]]]);

  act(() => {
    ref.current!.addRangeToSelection(0, 0);
  });

  expect(events.splice(0)).toEqual([
    [item1, [item1, item3updated]], // update reflected in callback!
  ]);

  const item1updated = {
    title: 'item 1 updated',
    done: false,
  };
  act(() => {
    ds.update(0, item1updated);
  });
  expect(events.splice(0)).toEqual([
    [item1updated, [item1updated, item3updated]], // update reflected in callback!
  ]);

  rendering.unmount();
});

test('open second panel and append', async () => {
  const ds = createTestDataSource();
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      enableMultiPanels
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
    />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
        </div>
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            true
          </span>
        </div>
      </div>
    `);
  }
  // hide done
  act(() => {
    ref.current?.toggleSideBySide();
  });
  expect(Object.keys(ds.additionalViews).length).toBeGreaterThan(0);
  act(() => {
    ds.append({
      title: 'Drink coffee',
      done: false,
    });
  });
  {
    const elem = await rendering.findAllByText('Drink coffee');
    expect(elem.length).toBe(2);
  }
  act(() => {
    ds.append({
      title: 'Drink tea',
      done: false,
    });
  });
  {
    const elem = await rendering.findAllByText('Drink tea');
    expect(elem.length).toBe(2);
  }
});

test('open second panel and update', async () => {
  const ds = createTestDataSource();
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      enableMultiPanels
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
    />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
        </div>
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            true
          </span>
        </div>
      </div>
    `);
  }
  // hide done
  act(() => {
    ds.append({
      title: 'Drink coffee',
      done: false,
    });
  });
  {
    const elems = await rendering.findAllByText('Drink coffee');
    expect(elems.length).toBe(1);
  }
  act(() => {
    ref.current?.toggleSideBySide();
  });
  expect(Object.keys(ds.additionalViews).length).toBeGreaterThan(0);
  {
    const elems = await rendering.findAllByText('Drink coffee');
    expect(elems.length).toBe(2);
  }
  act(() => {
    ds.update(0, {
      title: 'DataTable tested',
      done: false,
    });
  });
  {
    const elems = await rendering.findAllByText('Drink coffee');
    expect(elems.length).toBe(2);
    expect(rendering.queryByText('test DataTable')).toBeNull();
    const newElems = await rendering.findAllByText('DataTable tested');
    expect(newElems.length).toBe(2);
  }
});

test('open second panel and column visibility', async () => {
  const ds = createTestDataSource();
  const ref = createRef<DataTableManager<Todo>>();
  const rendering = render(
    <DataTable
      enableMultiPanels
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
    />,
  );
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(1);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
        </div>
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            true
          </span>
        </div>
      </div>
    `);
  }

  // toggle column visibility of first table(main panel)
  act(() => {
    ref.current?.toggleSideBySide();
    ref.current?.toggleColumnVisibility('done');
  });
  {
    const elem = await rendering.findAllByText('test DataTable');
    expect(elem.length).toBe(2);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            test DataTable
          </span>
        </div>
      </div>
    `);
  }

  act(() => {
    ds.update(0, {
      title: 'DataTable tested',
      done: false,
    });
  });
  {
    expect(rendering.queryByText('test DataTable')).toBeNull();
    const elem = await rendering.findAllByText('DataTable tested');
    expect(elem.length).toBe(2);
    expect(elem[0].parentElement?.parentElement).toMatchInlineSnapshot(`
      <div
        class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
      >
        <div
          class="css-1baxqcf-TableBodyColumnContainer e1luu51r0"
          width="50%"
        >
          <span>
            <span
              style="background-color: rgb(255, 245, 102);"
            />
            DataTable tested
          </span>
        </div>
      </div>
    `);
  }
});

test('open second panel and closing deletes dataView', async () => {
  const ds = createTestDataSource();
  const ref = createRef<DataTableManager<Todo>>();
  render(
    <DataTable
      enableMultiPanels
      dataSource={ds}
      columns={columns}
      tableManagerRef={ref}
    />,
  );
  expect(Object.keys(ds.additionalViews).length).toBe(0);
  act(() => {
    ref.current?.toggleSideBySide();
  });
  expect(Object.keys(ds.additionalViews).length).toBe(1);
  act(() => {
    ref.current?.toggleSideBySide();
  });
  expect(Object.keys(ds.additionalViews).length).toBe(0);
});

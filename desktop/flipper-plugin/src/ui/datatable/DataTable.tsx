/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {MutableRefObject, RefObject, useMemo} from 'react';
import {TableRow, DEFAULT_ROW_HEIGHT} from './TableRow';
import {DataSource} from '../../state/datasource/DataSource';
import {Layout} from '../Layout';
import {TableHead} from './TableHead';
import {Percentage} from '../utils/widthUtils';
import {DataSourceRenderer} from './DataSourceRenderer';
import {useDataTableManager, TableManager} from './useDataTableManager';

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  dataSource: DataSource<T, any, any>;
  autoScroll?: boolean;
  tableManagerRef?: RefObject<TableManager>;
  _testHeight?: number; // exposed for unit testing only
}

export type DataTableColumn<T = any> = {
  key: keyof T & string;
  // possible future extension: getValue(row) (and free-form key) to support computed columns
  onRender?: (row: T) => React.ReactNode;
  title?: string;
  width?: number | Percentage | undefined; // undefined: use all remaining width
  wrap?: boolean;
  align?: 'left' | 'right' | 'center';
  visible?: boolean;
};

export interface RenderingConfig<T = any> {
  columns: DataTableColumn<T>[];
}

export function DataTable<T extends object>(props: DataTableProps<T>) {
  const tableManager = useDataTableManager<T>(props.dataSource, props.columns);
  if (props.tableManagerRef) {
    (props.tableManagerRef as MutableRefObject<TableManager>).current = tableManager;
  }

  const renderingConfig = useMemo(() => {
    return {
      columns: tableManager.visibleColumns,
    };
  }, [tableManager.visibleColumns]);

  const usesWrapping = useMemo(
    () => tableManager.columns.some((col) => col.wrap),
    [tableManager.columns],
  );

  return (
    <Layout.Top>
      <TableHead
        columns={tableManager.columns}
        visibleColumns={tableManager.visibleColumns}
        onColumnResize={tableManager.resizeColumn}
        onReset={tableManager.reset}
        onColumnToggleVisibility={tableManager.toggleColumnVisibility}
        sorting={tableManager.sorting}
        onColumnSort={tableManager.sortColumn}
      />
      <DataSourceRenderer<any, RenderContext>
        dataSource={props.dataSource}
        autoScroll={props.autoScroll}
        useFixedRowHeight={!usesWrapping}
        defaultRowHeight={DEFAULT_ROW_HEIGHT}
        context={renderingConfig}
        itemRenderer={itemRenderer}
        _testHeight={props._testHeight}
      />
    </Layout.Top>
  );
}

export type RenderContext = {
  columns: DataTableColumn<any>[];
};

function itemRenderer(item: any, index: number, renderContext: RenderContext) {
  return (
    <TableRow
      key={index}
      config={renderContext}
      row={item}
      highlighted={false}
    />
  );
}

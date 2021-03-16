/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  RefObject,
  MutableRefObject,
} from 'react';
import {TableRow, DEFAULT_ROW_HEIGHT} from './TableRow';
import {DataSource} from '../../state/datasource/DataSource';
import {Layout} from '../Layout';
import {TableHead} from './TableHead';
import {Percentage} from '../../utils/widthUtils';
import {DataSourceRenderer, DataSourceVirtualizer} from './DataSourceRenderer';
import {useDataTableManager, TableManager} from './useDataTableManager';
import {TableSearch} from './TableSearch';
import styled from '@emotion/styled';
import {theme} from '../theme';

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  dataSource: DataSource<T, any, any>;
  autoScroll?: boolean;
  extraActions?: React.ReactElement;
  // custom onSearch(text, row) option?
  /**
   * onSelect event
   * @param item currently selected item
   * @param index index of the selected item in the datasources' output.
   * Note that the index could potentially refer to a different item if rendering is 'behind' and items have shifted
   */
  onSelect?(item: T | undefined, index: number): void;
  // multiselect?: true
  // onMultiSelect
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
  filters?: {
    label: string;
    value: string;
    enabled: boolean;
    predefined?: boolean;
  }[];
};

export interface RenderContext<T = any> {
  columns: DataTableColumn<T>[];
  onClick(item: T, itemId: number): void;
}

export function DataTable<T extends object>(props: DataTableProps<T>) {
  const {dataSource} = props;
  const virtualizerRef = useRef<DataSourceVirtualizer | undefined>();
  const tableManager = useDataTableManager<T>(
    dataSource,
    props.columns,
    props.onSelect,
  );
  if (props.tableManagerRef) {
    (props.tableManagerRef as MutableRefObject<TableManager>).current = tableManager;
  }
  const {visibleColumns, selectItem, selection} = tableManager;

  const renderingConfig = useMemo<RenderContext<T>>(() => {
    return {
      columns: visibleColumns,
      onClick(_, itemIdx) {
        selectItem(() => itemIdx);
      },
    };
  }, [visibleColumns, selectItem]);

  const usesWrapping = useMemo(
    () => tableManager.columns.some((col) => col.wrap),
    [tableManager.columns],
  );

  const itemRenderer = useCallback(
    function itemRenderer(
      item: any,
      index: number,
      renderContext: RenderContext<T>,
    ) {
      return (
        <TableRow
          key={index}
          config={renderContext}
          value={item}
          itemIndex={index}
          highlighted={index === tableManager.selection}
        />
      );
    },
    [tableManager.selection],
  );

  /**
   * Keyboard / selection handling
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      let handled = true;
      switch (e.key) {
        case 'ArrowUp':
          selectItem((idx) => (idx > 0 ? idx - 1 : 0));
          break;
        case 'ArrowDown':
          selectItem((idx) =>
            idx < dataSource.output.length - 1 ? idx + 1 : idx,
          );
          break;
        case 'Home':
          selectItem(() => 0);
          break;
        case 'End':
          selectItem(() => dataSource.output.length - 1);
          break;
        case ' ': // yes, that is a space
        case 'PageDown':
          selectItem((idx) =>
            Math.min(
              dataSource.output.length - 1,
              idx + virtualizerRef.current!.virtualItems.length - 1,
            ),
          );
          break;
        case 'PageUp':
          selectItem((idx) =>
            Math.max(0, idx - virtualizerRef.current!.virtualItems.length - 1),
          );
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    [selectItem, dataSource],
  );

  useLayoutEffect(
    function scrollSelectionIntoView() {
      if (selection >= 0) {
        virtualizerRef.current?.scrollToIndex(selection, {
          align: 'auto',
        });
      }
    },
    [selection],
  );

  /** Range finder */
  const [range, setRange] = useState('');
  const hideRange = useRef<NodeJS.Timeout>();

  const onRangeChange = useCallback(
    (start: number, end: number, total: number) => {
      // TODO: figure out if we don't trigger this callback to often hurting perf
      setRange(`${start} - ${end} / ${total}`);
      clearTimeout(hideRange.current!);
      hideRange.current = setTimeout(() => {
        setRange('');
      }, 1000);
    },
    [],
  );

  return (
    <Layout.Container grow>
      <Layout.Top>
        <Layout.Container>
          <TableSearch
            onSearch={tableManager.setSearchValue}
            extraActions={props.extraActions}
          />
          <TableHead
            columns={tableManager.columns}
            visibleColumns={tableManager.visibleColumns}
            onColumnResize={tableManager.resizeColumn}
            onReset={tableManager.reset}
            onColumnToggleVisibility={tableManager.toggleColumnVisibility}
            sorting={tableManager.sorting}
            onColumnSort={tableManager.sortColumn}
            onAddColumnFilter={tableManager.addColumnFilter}
            onRemoveColumnFilter={tableManager.removeColumnFilter}
            onToggleColumnFilter={tableManager.toggleColumnFilter}
          />
        </Layout.Container>
        <DataSourceRenderer<T, RenderContext<T>>
          dataSource={dataSource}
          autoScroll={props.autoScroll}
          useFixedRowHeight={!usesWrapping}
          defaultRowHeight={DEFAULT_ROW_HEIGHT}
          context={renderingConfig}
          itemRenderer={itemRenderer}
          onKeyDown={onKeyDown}
          virtualizerRef={virtualizerRef}
          onRangeChange={onRangeChange}
          _testHeight={props._testHeight}
        />
      </Layout.Top>
      {range && <RangeFinder>{range}</RangeFinder>}
    </Layout.Container>
  );
}

const RangeFinder = styled.div({
  backgroundColor: theme.backgroundWash,
  position: 'absolute',
  right: 40,
  bottom: 20,
  padding: '4px 8px',
  color: theme.textColorSecondary,
  fontSize: '0.8em',
});

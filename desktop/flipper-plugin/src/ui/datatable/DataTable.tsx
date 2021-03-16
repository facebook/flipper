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
import {
  tableContextMenuFactory,
  TableContextMenuContext,
} from './TableContextMenu';
import {useMemoize} from '../../utils/useMemoize';

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  dataSource: DataSource<T, any, any>;
  autoScroll?: boolean;
  extraActions?: React.ReactElement;
  // custom onSearch(text, row) option?
  onSelect?(item: T | undefined, items: T[]): void;
  // multiselect?: true
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
  onMouseEnter(
    e: React.MouseEvent<HTMLDivElement>,
    item: T,
    itemId: number,
  ): void;
  onMouseDown(
    e: React.MouseEvent<HTMLDivElement>,
    item: T,
    itemId: number,
  ): void;
}

export function DataTable<T extends object>(
  props: DataTableProps<T>,
): React.ReactElement {
  const {dataSource} = props;
  const virtualizerRef = useRef<DataSourceVirtualizer | undefined>();
  const tableManager = useDataTableManager(
    dataSource,
    props.columns,
    props.onSelect,
  );
  if (props.tableManagerRef) {
    (props.tableManagerRef as MutableRefObject<TableManager>).current = tableManager;
  }
  const {
    visibleColumns,
    selectItem,
    selection,
    addRangeToSelection,
    addColumnFilter,
    getSelectedItem,
    getSelectedItems,
  } = tableManager;

  const renderingConfig = useMemo<RenderContext<T>>(() => {
    let dragging = false;
    let startIndex = 0;
    return {
      columns: visibleColumns,
      onMouseEnter(_e, _item, index) {
        if (dragging) {
          // by computing range we make sure no intermediate items are missed when scrolling fast
          addRangeToSelection(startIndex, index);
        }
      },
      onMouseDown(e, _item, index) {
        if (!dragging) {
          if (e.ctrlKey || e.metaKey) {
            addRangeToSelection(index, index, true);
          } else if (e.shiftKey) {
            selectItem(index, true);
          } else {
            selectItem(index);
          }

          dragging = true;
          startIndex = index;

          function onStopDragSelecting() {
            dragging = false;
            document.removeEventListener('mouseup', onStopDragSelecting);
          }

          document.addEventListener('mouseup', onStopDragSelecting);
        }
      },
    };
  }, [visibleColumns, selectItem, addRangeToSelection]);

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
          highlighted={
            index === selection.current || selection.items.has(index)
          }
        />
      );
    },
    [selection],
  );

  /**
   * Keyboard / selection handling
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      let handled = true;
      const shiftPressed = e.shiftKey;
      const outputSize = dataSource.output.length;
      const windowSize = virtualizerRef.current!.virtualItems.length;
      switch (e.key) {
        case 'ArrowUp':
          selectItem((idx) => (idx > 0 ? idx - 1 : 0), shiftPressed);
          break;
        case 'ArrowDown':
          selectItem(
            (idx) => (idx < outputSize - 1 ? idx + 1 : idx),
            shiftPressed,
          );
          break;
        case 'Home':
          selectItem(0, shiftPressed);
          break;
        case 'End':
          selectItem(outputSize - 1, shiftPressed);
          break;
        case ' ': // yes, that is a space
        case 'PageDown':
          selectItem(
            (idx) => Math.min(outputSize - 1, idx + windowSize - 1),
            shiftPressed,
          );
          break;
        case 'PageUp':
          selectItem((idx) => Math.max(0, idx - windowSize + 1), shiftPressed);
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
      if (selection && selection.current >= 0) {
        virtualizerRef.current?.scrollToIndex(selection!.current, {
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

  /** Context menu */
  // TODO: support customizing context menu
  const contexMenu = props._testHeight
    ? undefined // don't render context menu in tests
    : // eslint-disable-next-line
    useMemoize(tableContextMenuFactory, [
        visibleColumns,
        addColumnFilter,
        getSelectedItem,
        getSelectedItems as any,
      ]);
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
        <TableContextMenuContext.Provider value={contexMenu}>
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
        </TableContextMenuContext.Provider>
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

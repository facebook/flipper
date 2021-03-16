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
  CSSProperties,
  useEffect,
} from 'react';
import {TableRow, DEFAULT_ROW_HEIGHT} from './TableRow';
import {DataSource} from '../../state/datasource/DataSource';
import {Layout} from '../Layout';
import {TableHead} from './TableHead';
import {Percentage} from '../../utils/widthUtils';
import {DataSourceRenderer, DataSourceVirtualizer} from './DataSourceRenderer';
import {useDataTableManager, DataTableManager} from './useDataTableManager';
import {TableSearch} from './TableSearch';
import styled from '@emotion/styled';
import {theme} from '../theme';
import {tableContextMenuFactory} from './TableContextMenu';
import {Typography} from 'antd';
import {CoffeeOutlined, SearchOutlined} from '@ant-design/icons';
import {useAssertStableRef} from '../../utils/useAssertStableRef';

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  dataSource: DataSource<T, any, any>;
  autoScroll?: boolean;
  extraActions?: React.ReactElement;
  onSelect?(record: T | undefined, records: T[]): void;
  onRowStyle?(record: T): CSSProperties | undefined;
  // multiselect?: true
  tableManagerRef?: RefObject<DataTableManager<T> | undefined>; // Actually we want a MutableRefObject, but that is not what React.createRef() returns, and we don't want to put the burden on the plugin dev to cast it...
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
  const {dataSource, onRowStyle} = props;
  useAssertStableRef(dataSource, 'dataSource');
  useAssertStableRef(onRowStyle, 'onRowStyle');
  useAssertStableRef(props.onSelect, 'onRowSelect');
  useAssertStableRef(props.columns, 'columns');
  useAssertStableRef(props._testHeight, '_testHeight');

  const virtualizerRef = useRef<DataSourceVirtualizer | undefined>();
  const tableManager = useDataTableManager(
    dataSource,
    props.columns,
    props.onSelect,
  );
  if (props.tableManagerRef) {
    (props.tableManagerRef as MutableRefObject<
      DataTableManager<T>
    >).current = tableManager;
  }
  const {
    visibleColumns,
    selectItem,
    selection,
    addRangeToSelection,
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
      record: T,
      index: number,
      renderContext: RenderContext<T>,
    ) {
      return (
        <TableRow
          key={index}
          config={renderContext}
          record={record}
          itemIndex={index}
          highlighted={
            index === selection.current || selection.items.has(index)
          }
          style={onRowStyle?.(record)}
        />
      );
    },
    [selection, onRowStyle],
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
    : tableContextMenuFactory(tableManager);

  const emptyRenderer = useCallback((dataSource: DataSource<T>) => {
    return <EmptyTable dataSource={dataSource} />;
  }, []);

  useEffect(
    function cleanup() {
      return () => {
        if (props.tableManagerRef) {
          (props.tableManagerRef as MutableRefObject<undefined>).current = undefined;
        }
      };
    },
    [props.tableManagerRef],
  );

  return (
    <Layout.Container grow>
      <Layout.Top>
        <Layout.Container>
          <TableSearch
            onSearch={tableManager.setSearchValue}
            extraActions={props.extraActions}
            contextMenu={contexMenu}
          />
          <TableHead
            visibleColumns={tableManager.visibleColumns}
            onColumnResize={tableManager.resizeColumn}
            onReset={tableManager.reset}
            sorting={tableManager.sorting}
            onColumnSort={tableManager.sortColumn}
            onAddColumnFilter={tableManager.addColumnFilter}
            onRemoveColumnFilter={tableManager.removeColumnFilter}
            onToggleColumnFilter={tableManager.toggleColumnFilter}
            onSetColumnFilterFromSelection={
              tableManager.setColumnFilterFromSelection
            }
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
          emptyRenderer={emptyRenderer}
          _testHeight={props._testHeight}
        />
      </Layout.Top>
      {range && <RangeFinder>{range}</RangeFinder>}
    </Layout.Container>
  );
}

function EmptyTable({dataSource}: {dataSource: DataSource<any>}) {
  return (
    <Layout.Container
      center
      style={{width: '100%', padding: 40, color: theme.textColorSecondary}}>
      {dataSource.records.length === 0 ? (
        <>
          <CoffeeOutlined style={{fontSize: '2em', margin: 8}} />
          <Typography.Text type="secondary">No records yet</Typography.Text>
        </>
      ) : (
        <>
          <SearchOutlined style={{fontSize: '2em', margin: 8}} />
          <Typography.Text type="secondary">
            No records match the current search / filter criteria
          </Typography.Text>
        </>
      )}
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

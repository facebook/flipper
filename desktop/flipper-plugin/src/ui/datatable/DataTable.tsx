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
  useContext,
  useReducer,
} from 'react';
import {TableRow, DEFAULT_ROW_HEIGHT} from './TableRow';
import {DataSource} from '../../state/DataSource';
import {Layout} from '../Layout';
import {TableHead} from './TableHead';
import {Percentage} from '../../utils/widthUtils';
import {DataSourceRenderer, DataSourceVirtualizer} from './DataSourceRenderer';
import {
  computeDataTableFilter,
  createDataTableManager,
  createInitialState,
  DataTableManager,
  dataTableManagerReducer,
  DataTableReducer,
  getSelectedItem,
  getSelectedItems,
  savePreferences,
} from './DataTableManager';
import {TableSearch} from './TableSearch';
import styled from '@emotion/styled';
import {theme} from '../theme';
import {tableContextMenuFactory} from './TableContextMenu';
import {Typography} from 'antd';
import {CoffeeOutlined, SearchOutlined} from '@ant-design/icons';
import {useAssertStableRef} from '../../utils/useAssertStableRef';
import {TrackingScopeContext} from 'flipper-plugin/src/ui/Tracked';
import {Formatter} from '../DataFormatter';

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
  formatters?: Formatter[] | Formatter;
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
  const {dataSource, onRowStyle, onSelect} = props;
  useAssertStableRef(dataSource, 'dataSource');
  useAssertStableRef(onRowStyle, 'onRowStyle');
  useAssertStableRef(props.onSelect, 'onRowSelect');
  useAssertStableRef(props.columns, 'columns');
  useAssertStableRef(props._testHeight, '_testHeight');

  // lint disabled for conditional inclusion of a hook (_testHeight is asserted to be stable)
  // eslint-disable-next-line
  const scope = props._testHeight ? "" : useContext(TrackingScopeContext); // TODO + plugin id
  const virtualizerRef = useRef<DataSourceVirtualizer | undefined>();
  const [state, dispatch] = useReducer(
    dataTableManagerReducer as DataTableReducer<T>,
    undefined,
    () =>
      createInitialState({
        dataSource,
        defaultColumns: props.columns,
        onSelect,
        scope,
        virtualizerRef,
      }),
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const lastOffset = useRef(0);

  const [tableManager] = useState(() =>
    createDataTableManager(dataSource, dispatch, stateRef),
  );

  const {columns, selection, searchValue, sorting} = state;

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  const renderingConfig = useMemo<RenderContext<T>>(() => {
    let dragging = false;
    let startIndex = 0;
    return {
      columns: visibleColumns,
      onMouseEnter(_e, _item, index) {
        if (dragging) {
          // by computing range we make sure no intermediate items are missed when scrolling fast
          tableManager.addRangeToSelection(startIndex, index);
        }
      },
      onMouseDown(e, _item, index) {
        if (!dragging) {
          if (e.ctrlKey || e.metaKey) {
            tableManager.addRangeToSelection(index, index, true);
          } else if (e.shiftKey) {
            tableManager.selectItem(index, true);
          } else {
            tableManager.selectItem(index);
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
  }, [visibleColumns, tableManager]);

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
          tableManager.selectItem(
            (idx) => (idx > 0 ? idx - 1 : 0),
            shiftPressed,
          );
          break;
        case 'ArrowDown':
          tableManager.selectItem(
            (idx) => (idx < outputSize - 1 ? idx + 1 : idx),
            shiftPressed,
          );
          break;
        case 'Home':
          tableManager.selectItem(0, shiftPressed);
          break;
        case 'End':
          tableManager.selectItem(outputSize - 1, shiftPressed);
          break;
        case ' ': // yes, that is a space
        case 'PageDown':
          tableManager.selectItem(
            (idx) => Math.min(outputSize - 1, idx + windowSize - 1),
            shiftPressed,
          );
          break;
        case 'PageUp':
          tableManager.selectItem(
            (idx) => Math.max(0, idx - windowSize + 1),
            shiftPressed,
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
    [dataSource, tableManager],
  );

  useEffect(
    function updateFilter() {
      dataSource.setFilter(
        computeDataTableFilter(state.searchValue, state.columns),
      );
    },
    // Important dep optimization: we don't want to recalc filters if just the width or visibility changes!
    // We pass entire state.columns to computeDataTableFilter, but only changes in the filter are a valid cause to compute a new filter function
    // eslint-disable-next-line
    [state.searchValue, ...state.columns.map((c) => c.filters)],
  );

  useEffect(
    function updateSorting() {
      if (state.sorting === undefined) {
        dataSource.setSortBy(undefined);
        dataSource.setReversed(false);
      } else {
        dataSource.setSortBy(state.sorting.key);
        dataSource.setReversed(state.sorting.direction === 'desc');
      }
    },
    [dataSource, state.sorting],
  );

  useEffect(
    function triggerSelection() {
      onSelect?.(
        getSelectedItem(dataSource, state.selection),
        getSelectedItems(dataSource, state.selection),
      );
    },
    [onSelect, dataSource, state.selection],
  );

  // The initialScrollPosition is used to both capture the initial px we want to scroll to,
  // and whether we performed that scrolling already (if so, it will be 0)
  // const initialScrollPosition = useRef(scrollOffset.current);
  useLayoutEffect(
    function scrollSelectionIntoView() {
      if (state.initialOffset) {
        virtualizerRef.current?.scrollToOffset(state.initialOffset);
        dispatch({
          type: 'appliedInitialScroll',
        });
      } else if (selection && selection.current >= 0) {
        virtualizerRef.current?.scrollToIndex(selection!.current, {
          align: 'auto',
        });
      }
    },
    // initialOffset is relevant for the first run,
    // but should not trigger the efffect in general
    // eslint-disable-next-line
    [selection],
  );

  /** Range finder */
  const [range, setRange] = useState('');
  const hideRange = useRef<NodeJS.Timeout>();

  const onRangeChange = useCallback(
    (start: number, end: number, total: number, offset) => {
      // TODO: figure out if we don't trigger this callback to often hurting perf
      setRange(`${start} - ${end} / ${total}`);
      lastOffset.current = offset;
      clearTimeout(hideRange.current!);
      hideRange.current = setTimeout(() => {
        setRange('');
      }, 1000);
    },
    [],
  );

  /** Context menu */
  const contexMenu = props._testHeight
    ? undefined
    : // eslint-disable-next-line
    useCallback(
        () =>
          tableContextMenuFactory(
            dataSource,
            dispatch,
            selection,
            state.columns,
            visibleColumns,
          ),
        [dataSource, dispatch, selection, state.columns, visibleColumns],
      );

  useEffect(function initialSetup() {
    if (props.tableManagerRef) {
      (props.tableManagerRef as MutableRefObject<any>).current = tableManager;
    }

    return function cleanup() {
      // write current prefs to local storage
      savePreferences(stateRef.current, lastOffset.current);
      // if the component unmounts, we reset the SFRW pipeline to
      // avoid wasting resources in the background
      dataSource.reset();
      // clean ref
      if (props.tableManagerRef) {
        (props.tableManagerRef as MutableRefObject<any>).current = undefined;
      }
    };
    // one-time setup and cleanup effect, everything in here is asserted to be stable:
    // dataSource, tableManager, tableManagerRef
    // eslint-disable-next-line
  }, []);

  return (
    <Layout.Container grow>
      <Layout.Top>
        <Layout.Container>
          <TableSearch
            searchValue={searchValue}
            dispatch={dispatch as any}
            contextMenu={contexMenu}
            extraActions={props.extraActions}
          />
          <TableHead
            visibleColumns={visibleColumns}
            dispatch={dispatch as any}
            sorting={sorting}
          />
        </Layout.Container>
        <DataSourceRenderer<T, RenderContext<T>>
          dataSource={dataSource}
          autoScroll={props.autoScroll}
          useFixedRowHeight={!state.usesWrapping}
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

function emptyRenderer(dataSource: DataSource<any>) {
  return <EmptyTable dataSource={dataSource} />;
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

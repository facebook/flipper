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
import {CoffeeOutlined, SearchOutlined, PushpinFilled} from '@ant-design/icons';
import {useAssertStableRef} from '../../utils/useAssertStableRef';
import {Formatter} from '../DataFormatter';
import {usePluginInstance} from '../../plugin/PluginContext';
import {debounce} from 'lodash';
import {StaticDataSourceRenderer} from './StaticDataSourceRenderer';
import {useInUnitTest} from '../../utils/useInUnitTest()';

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];

  autoScroll?: boolean;
  extraActions?: React.ReactElement;
  onSelect?(record: T | undefined, records: T[]): void;
  onRowStyle?(record: T): CSSProperties | undefined;
  // multiselect?: true
  tableManagerRef?: RefObject<DataTableManager<T> | undefined>; // Actually we want a MutableRefObject, but that is not what React.createRef() returns, and we don't want to put the burden on the plugin dev to cast it...
  onCopyRows?(records: T[]): string;
  onContextMenu?: (selection: undefined | T) => React.ReactElement;
  searchbar?: boolean;
  scrollable?: boolean;
}

type DataTableInput<T = any> =
  | {dataSource: DataSource<T, any, any>}
  | {
      records: T[];
    };

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
  props: DataTableInput<T> & DataTableProps<T>,
): React.ReactElement {
  const {onRowStyle, onSelect, onCopyRows, onContextMenu} = props;
  const dataSource = normalizeDataSourceInput(props);
  useAssertStableRef(dataSource, 'dataSource');
  useAssertStableRef(onRowStyle, 'onRowStyle');
  useAssertStableRef(props.onSelect, 'onRowSelect');
  useAssertStableRef(props.columns, 'columns');
  useAssertStableRef(onCopyRows, 'onCopyRows');
  useAssertStableRef(onContextMenu, 'onContextMenu');
  const isUnitTest = useInUnitTest();

  // eslint-disable-next-line
  const scope = isUnitTest ? "" : usePluginInstance().pluginKey;
  const virtualizerRef = useRef<DataSourceVirtualizer | undefined>();
  const [tableState, dispatch] = useReducer(
    dataTableManagerReducer as DataTableReducer<T>,
    undefined,
    () =>
      createInitialState({
        dataSource,
        defaultColumns: props.columns,
        onSelect,
        scope,
        virtualizerRef,
        autoScroll: props.autoScroll,
      }),
  );

  const stateRef = useRef(tableState);
  stateRef.current = tableState;
  const lastOffset = useRef(0);
  const dragging = useRef(false);

  const [tableManager] = useState(() =>
    createDataTableManager(dataSource, dispatch, stateRef),
  );

  const {columns, selection, searchValue, sorting} = tableState;

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  const renderingConfig = useMemo<RenderContext<T>>(() => {
    let startIndex = 0;
    return {
      columns: visibleColumns,
      onMouseEnter(e, _item, index) {
        if (dragging.current && e.buttons === 1) {
          // by computing range we make sure no intermediate items are missed when scrolling fast
          tableManager.addRangeToSelection(startIndex, index);
        }
      },
      onMouseDown(e, _item, index) {
        if (!dragging.current) {
          if (e.ctrlKey || e.metaKey) {
            tableManager.addRangeToSelection(index, index, true);
          } else if (e.shiftKey) {
            tableManager.selectItem(index, true);
          } else {
            tableManager.selectItem(index);
          }

          dragging.current = true;
          startIndex = index;

          function onStopDragSelecting() {
            dragging.current = false;
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
      const outputSize = dataSource.view.size;
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
        case 'Escape':
          tableManager.clearSelection();
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

  const [debouncedSetFilter] = useState(() => {
    // we don't want to trigger filter changes too quickly, as they can be pretty expensive
    // and would block the user from entering text in the search bar for example
    // (and in the future would really benefit from concurrent mode here :))
    const setFilter = (
      search: string,
      useRegex: boolean,
      columns: DataTableColumn<T>[],
    ) => {
      dataSource.view.setFilter(
        computeDataTableFilter(search, useRegex, columns),
      );
    };
    return isUnitTest ? setFilter : debounce(setFilter, 250);
  });
  useEffect(
    function updateFilter() {
      debouncedSetFilter(
        tableState.searchValue,
        tableState.useRegex,
        tableState.columns,
      );
    },
    // Important dep optimization: we don't want to recalc filters if just the width or visibility changes!
    // We pass entire state.columns to computeDataTableFilter, but only changes in the filter are a valid cause to compute a new filter function
    // eslint-disable-next-line
    [tableState.searchValue, tableState.useRegex, ...tableState.columns.map((c) => c.filters)],
  );

  useEffect(
    function updateSorting() {
      if (tableState.sorting === undefined) {
        dataSource.view.setSortBy(undefined);
        dataSource.view.setReversed(false);
      } else {
        dataSource.view.setSortBy(tableState.sorting.key);
        dataSource.view.setReversed(tableState.sorting.direction === 'desc');
      }
    },
    [dataSource, tableState.sorting],
  );

  useEffect(
    function triggerSelection() {
      onSelect?.(
        getSelectedItem(dataSource, tableState.selection),
        getSelectedItems(dataSource, tableState.selection),
      );
    },
    [onSelect, dataSource, tableState.selection],
  );

  // The initialScrollPosition is used to both capture the initial px we want to scroll to,
  // and whether we performed that scrolling already (if so, it will be 0)
  useLayoutEffect(
    function scrollSelectionIntoView() {
      if (tableState.initialOffset) {
        virtualizerRef.current?.scrollToOffset(tableState.initialOffset);
        dispatch({
          type: 'appliedInitialScroll',
        });
      } else if (selection && selection.current >= 0) {
        dispatch({type: 'setAutoScroll', autoScroll: false});
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
      setRange(`${start} - ${end} / ${total}`);
      lastOffset.current = offset;
      clearTimeout(hideRange.current!);
      hideRange.current = setTimeout(() => {
        setRange('');
      }, 1000);
    },
    [],
  );

  const onUpdateAutoScroll = useCallback(
    (autoScroll: boolean) => {
      if (props.autoScroll) {
        dispatch({type: 'setAutoScroll', autoScroll});
      }
    },
    [props.autoScroll],
  );

  /** Context menu */
  const contexMenu = isUnitTest
    ? undefined
    : // eslint-disable-next-line
    useCallback(
        () =>
          tableContextMenuFactory(
            dataSource,
            dispatch,
            selection,
            tableState.columns,
            visibleColumns,
            onCopyRows,
            onContextMenu,
          ),
        [
          dataSource,
          dispatch,
          selection,
          tableState.columns,
          visibleColumns,
          onCopyRows,
          onContextMenu,
        ],
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
      dataSource.view.reset();
      // clean ref
      if (props.tableManagerRef) {
        (props.tableManagerRef as MutableRefObject<any>).current = undefined;
      }
    };
    // one-time setup and cleanup effect, everything in here is asserted to be stable:
    // dataSource, tableManager, tableManagerRef
    // eslint-disable-next-line
  }, []);

  const header = (
    <Layout.Container>
      {props.searchbar !== false && (
        <TableSearch
          searchValue={searchValue}
          useRegex={tableState.useRegex}
          dispatch={dispatch as any}
          contextMenu={contexMenu}
          extraActions={props.extraActions}
        />
      )}
      <TableHead
        visibleColumns={visibleColumns}
        dispatch={dispatch as any}
        sorting={sorting}
        scrollbarSize={
          props.scrollable === false
            ? 0
            : 15 /* width on MacOS: TODO, determine dynamically */
        }
      />
    </Layout.Container>
  );

  const mainSection =
    props.scrollable !== false ? (
      <Layout.Top>
        {header}
        <DataSourceRenderer<T, RenderContext<T>>
          dataSource={dataSource}
          autoScroll={tableState.autoScroll && !dragging.current}
          useFixedRowHeight={!tableState.usesWrapping}
          defaultRowHeight={DEFAULT_ROW_HEIGHT}
          context={renderingConfig}
          itemRenderer={itemRenderer}
          onKeyDown={onKeyDown}
          virtualizerRef={virtualizerRef}
          onRangeChange={onRangeChange}
          onUpdateAutoScroll={onUpdateAutoScroll}
          emptyRenderer={emptyRenderer}
        />
      </Layout.Top>
    ) : (
      <Layout.Container>
        {header}
        <StaticDataSourceRenderer<T, RenderContext<T>>
          dataSource={dataSource}
          useFixedRowHeight={!tableState.usesWrapping}
          defaultRowHeight={DEFAULT_ROW_HEIGHT}
          context={renderingConfig}
          itemRenderer={itemRenderer}
          onKeyDown={onKeyDown}
          emptyRenderer={emptyRenderer}
        />
      </Layout.Container>
    );

  return (
    <Layout.Container grow={props.scrollable !== false}>
      {mainSection}
      {props.autoScroll && (
        <AutoScroller>
          <PushpinFilled
            style={{
              color: tableState.autoScroll ? theme.textColorActive : undefined,
            }}
            onClick={() => {
              dispatch({type: 'toggleAutoScroll'});
            }}
          />
        </AutoScroller>
      )}
      {range && !isUnitTest && <RangeFinder>{range}</RangeFinder>}
    </Layout.Container>
  );
}

/* eslint-disable react-hooks/rules-of-hooks */
function normalizeDataSourceInput<T>(props: DataTableInput<T>): DataSource<T> {
  if ('dataSource' in props) {
    return props.dataSource;
  }
  if ('records' in props) {
    const [dataSource] = useState(() => {
      const ds = new DataSource<T>(undefined);
      syncRecordsToDataSource(ds, props.records);
      return ds;
    });
    useEffect(() => {
      syncRecordsToDataSource(dataSource, props.records);
    }, [dataSource, props.records]);

    return dataSource;
  }
  throw new Error(
    `Either the 'dataSource' or 'records' prop should be provided to DataTable`,
  );
}
/* eslint-enable */

function syncRecordsToDataSource<T>(ds: DataSource<T>, records: T[]) {
  const startTime = Date.now();
  ds.clear();
  // TODO: optimize in the case we're only dealing with appends or replacements
  records.forEach((r) => ds.append(r));
  const duration = Math.abs(Date.now() - startTime);
  if (duration > 50 || records.length > 500) {
    console.warn(
      "The 'records' props is only intended to be used on small datasets. Please use a 'dataSource' instead. See createDataSource for details: https://fbflipper.com/docs/extending/flipper-plugin#createdatasource",
    );
  }
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
  right: 64,
  bottom: 20,
  padding: '4px 8px',
  color: theme.textColorSecondary,
  fontSize: '0.8em',
});

const AutoScroller = styled.div({
  backgroundColor: theme.backgroundWash,
  position: 'absolute',
  right: 40,
  bottom: 20,
  width: 24,
  padding: '4px 8px',
  color: theme.textColorSecondary,
  fontSize: '0.8em',
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import {Layout} from '../Layout';
import {TableHead} from './TableHead';
import {Percentage} from '../../utils/widthUtils';
import {
  DataSourceRendererVirtual,
  DataSourceRendererStatic,
  DataSourceVirtualizer,
} from '../../data-source/index';
import {
  computeDataTableFilter,
  createDataTableManager,
  createInitialState,
  DataManagerState,
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
import {Menu, Switch, InputRef, Typography} from 'antd';
import {CoffeeOutlined, SearchOutlined, PushpinFilled} from '@ant-design/icons';
import {useAssertStableRef} from '../../utils/useAssertStableRef';
import {Formatter} from '../DataFormatter';
import {usePluginInstanceMaybe} from '../../plugin/PluginContext';
import {debounce} from 'lodash';
import {useInUnitTest} from '../../utils/useInUnitTest';
import {
  createDataSource,
  DataSource,
  _DataSourceView,
} from 'flipper-plugin-core';
import {HighlightProvider} from '../Highlight';
import {useLatestRef} from '../../utils/useLatestRef';

type DataTableBaseProps<T = any> = {
  columns: DataTableColumn<T>[];
  enableSearchbar?: boolean;
  enableAutoScroll?: boolean;
  enableHorizontalScroll?: boolean;
  enableColumnHeaders?: boolean;
  enableMultiSelect?: boolean;
  enableContextMenu?: boolean;
  enablePersistSettings?: boolean;
  enableMultiPanels?: boolean;
  // if set (the default) will grow and become scrollable. Otherwise will use natural size
  scrollable?: boolean;
  extraActions?: React.ReactElement;
  onSelect?(record: T | undefined, records: T[]): void;
  onRowStyle?(record: T): CSSProperties | undefined;
  tableManagerRef?: RefObject<DataTableManager<T> | undefined>; // Actually we want a MutableRefObject, but that is not what React.createRef() returns, and we don't want to put the burden on the plugin dev to cast it...
  virtualizerRef?: RefObject<DataSourceVirtualizer | undefined>;
  onCopyRows?(records: T[]): string;
  onContextMenu?: (selection: undefined | T) => React.ReactElement;
  onRenderEmpty?:
    | null
    | ((dataView?: _DataSourceView<T, T[keyof T]>) => React.ReactElement);
};

export type ItemRenderer<T> = (
  item: T,
  selected: boolean,
  index: number,
) => React.ReactNode;

type DataTableInput<T = any> =
  | {
      dataSource: DataSource<T, T[keyof T]>;
      viewId?: string;
      records?: undefined;
      recordsKey?: undefined;
    }
  | {
      records: readonly T[];
      recordsKey?: keyof T;
      viewId?: string;
      dataSource?: undefined;
    };

export type DataTableColumn<T = any> = {
  //this can be a dotted path into a nest objects. e.g foo.bar
  key: keyof T & string;
  // possible future extension: getValue(row) (and free-form key) to support computed columns
  onRender?: (row: T, selected: boolean, index: number) => React.ReactNode;
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
  inversed?: boolean;
  sortable?: boolean;
};

export interface TableRowRenderContext<T = any> {
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
  onRowStyle?(item: T): React.CSSProperties | undefined;
  onContextMenu?(): React.ReactElement;
}

export type DataTableProps<T> = DataTableInput<T> & DataTableBaseProps<T>;

export function DataTable<T extends object>(
  props: DataTableProps<T>,
): React.ReactElement {
  const {onRowStyle, onSelect, onCopyRows, onContextMenu} = props;
  const dataSource = normalizeDataSourceInput(props);
  const dataView = props?.viewId
    ? dataSource.getAdditionalView(props.viewId)
    : dataSource.view;
  useAssertStableRef(dataSource, 'dataSource');
  useAssertStableRef(onRowStyle, 'onRowStyle');
  useAssertStableRef(props.onSelect, 'onRowSelect');
  useAssertStableRef(props.columns, 'columns');
  useAssertStableRef(onCopyRows, 'onCopyRows');
  useAssertStableRef(onContextMenu, 'onContextMenu');

  const isUnitTest = useInUnitTest();

  // eslint-disable-next-line
  const scope = isUnitTest ? '' : usePluginInstanceMaybe()?.definition.id ?? '';
  let virtualizerRef = useRef<DataSourceVirtualizer | undefined>();
  if (props.virtualizerRef) {
    virtualizerRef = props.virtualizerRef as React.MutableRefObject<
      DataSourceVirtualizer | undefined
    >;
  }
  const [tableState, dispatch] = useReducer(
    dataTableManagerReducer as DataTableReducer<T>,
    undefined,
    () =>
      createInitialState({
        dataSource,
        dataView,
        defaultColumns: props.columns,
        onSelect,
        scope,
        virtualizerRef,
        autoScroll: props.enableAutoScroll,
        enablePersistSettings: props.enablePersistSettings,
      }),
  );

  const stateRef = useRef(tableState);
  stateRef.current = tableState;
  const searchInputRef = useRef<InputRef>(null) as MutableRefObject<InputRef>;
  const lastOffset = useRef(0);
  const dragging = useRef(false);

  const [tableManager] = useState(() =>
    createDataTableManager(dataView, dispatch, stateRef),
  );
  // Make sure this is the main table
  if (props.tableManagerRef && !props.viewId) {
    (props.tableManagerRef as MutableRefObject<any>).current = tableManager;
  }

  const {columns, selection, searchValue, sorting} = tableState;

  const latestSelectionRef = useLatestRef(selection);
  const latestOnSelectRef = useLatestRef(onSelect);
  useEffect(() => {
    if (dataView) {
      const unsubscribe = dataView.addListener((change) => {
        if (
          change.type === 'update' &&
          latestSelectionRef.current.items.has(change.index)
        ) {
          latestOnSelectRef.current?.(
            getSelectedItem(dataView, latestSelectionRef.current),
            getSelectedItems(dataView, latestSelectionRef.current),
          );
        }
      });

      return unsubscribe;
    }
  }, [dataView, latestSelectionRef, latestOnSelectRef]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  const renderingConfig = useMemo<TableRowRenderContext<T>>(() => {
    let startIndex = 0;

    return {
      columns: visibleColumns,
      onMouseEnter(e, _item, index) {
        if (dragging.current && e.buttons === 1 && props.enableMultiSelect) {
          // by computing range we make sure no intermediate items are missed when scrolling fast
          tableManager.addRangeToSelection(startIndex, index);
        }
      },
      onMouseDown(e, _item, index) {
        if (!props.enableMultiSelect && e.buttons > 1) {
          tableManager.selectItem(index, false, true);
          return;
        }
        if (!dragging.current) {
          if (e.buttons > 1) {
            // for right click we only want to add if needed, not deselect
            tableManager.addRangeToSelection(index, index, false);
          } else if (e.ctrlKey || e.metaKey) {
            tableManager.addRangeToSelection(index, index, true);
          } else if (e.shiftKey) {
            tableManager.selectItem(index, true, true);
          } else {
            tableManager.selectItem(index, false, true);
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
      onRowStyle,
      onContextMenu: props.enableContextMenu
        ? () => {
            // using a ref keeps the config stable, so that a new context menu doesn't need
            // all rows to be rerendered, but rather shows it conditionally
            return contextMenuRef.current?.()!;
          }
        : undefined,
    };
  }, [
    visibleColumns,
    tableManager,
    onRowStyle,
    props.enableContextMenu,
    props.enableMultiSelect,
  ]);

  const itemRenderer = useCallback(
    function itemRenderer(
      record: T,
      index: number,
      renderContext: TableRowRenderContext<T>,
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
      const outputSize = dataView.size;
      const controlPressed = e.ctrlKey;
      const windowSize = props.scrollable
        ? virtualizerRef.current?.virtualItems.length ?? 0
        : dataView.size;
      if (!windowSize) {
        return;
      }
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
        case 't':
          if (controlPressed) {
            tableManager.toggleSearchValue();
          }
          break;
        case 'H':
          tableManager.toggleHighlightSearch();
          break;
        case 'f':
          if (controlPressed && searchInputRef?.current) {
            searchInputRef?.current.focus();
            tableManager.showSearchDropdown(true);
            tableManager.setShowNumberedHistory(true);
          }
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    [dataView, props.scrollable, tableManager],
  );

  const [setFilter] = useState(() => (tableState: DataManagerState<T>) => {
    const selectedEntry =
      tableState.selection.current >= 0
        ? dataView.getEntry(tableState.selection.current)
        : null;
    dataView.setFilter(
      computeDataTableFilter(
        tableState.searchValue,
        tableState.useRegex,
        tableState.columns,
      ),
    );
    // TODO: in the future setFilter effects could be async, at the moment it isn't,
    // so we can safely assume the internal state of the dataView is updated with the
    // filter changes and try to find the same entry back again
    if (selectedEntry) {
      const selectionIndex = dataView.getViewIndexOfEntry(selectedEntry);
      tableManager.selectItem(selectionIndex, false, false);
      // we disable autoScroll as is it can accidentally be annoying if it was never turned off and
      // filter causes items to not fill the available space
      dispatch({type: 'setAutoScroll', autoScroll: false});
      virtualizerRef.current?.scrollToIndex(selectionIndex, {align: 'center'});
      setTimeout(() => {
        virtualizerRef.current?.scrollToIndex(selectionIndex, {
          align: 'center',
        });
      }, 0);
    }
    // TODO: could do the same for multiselections, doesn't seem to be requested so far
  });

  const [debouncedSetFilter] = useState(() => {
    // we don't want to trigger filter changes too quickly, as they can be pretty expensive
    // and would block the user from entering text in the search bar for example
    // (and in the future would really benefit from concurrent mode here :))
    // leading is set to true so that an initial filter is immediately applied and a flash of wrong content is prevented
    // this also makes clear act faster
    return isUnitTest ? setFilter : debounce(setFilter, 250);
  });

  useEffect(
    function updateFilter() {
      if (!dataView.isFiltered) {
        setFilter(tableState);
      } else {
        debouncedSetFilter(tableState);
      }
    },
    // Important dep optimization: we don't want to recalc filters if just the width or visibility changes!
    // We pass entire state.columns to computeDataTableFilter, but only changes in the filter are a valid cause to compute a new filter function
    // eslint-disable-next-line
    [
      tableState.searchValue,
      tableState.useRegex,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...tableState.columns.map((c) => c.filters),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...tableState.columns.map((c) => c.inversed),
    ],
  );

  useEffect(
    function updateSorting() {
      if (tableState.sorting === undefined) {
        dataView.setSortBy(undefined);
        dataView.setReversed(false);
      } else {
        dataView.setSortBy(tableState.sorting.key);
        dataView.setReversed(tableState.sorting.direction === 'desc');
      }
    },
    [dataView, tableState.sorting],
  );

  const isMounted = useRef(false);
  useEffect(
    function triggerSelection() {
      if (isMounted.current) {
        onSelect?.(
          getSelectedItem(dataView, tableState.selection),
          getSelectedItems(dataView, tableState.selection),
        );
      }
      isMounted.current = true;
    },
    [onSelect, dataView, tableState.selection],
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
  const hideRange = useRef<any>();

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
      if (props.enableAutoScroll) {
        dispatch({type: 'setAutoScroll', autoScroll});
      }
    },
    [props.enableAutoScroll],
  );

  const sidePanelToggle = useMemo(
    () => (
      <Menu.Item key="toggle side by side">
        <Layout.Horizontal
          gap
          center
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}>
          Side By Side View
          <Switch
            checked={tableState.sideBySide}
            size="small"
            onChange={() => {
              tableManager.toggleSideBySide();
            }}
          />
        </Layout.Horizontal>
      </Menu.Item>
    ),
    [tableManager, tableState.sideBySide],
  );

  /** Context menu */
  const contexMenu = isUnitTest
    ? undefined
    : // eslint-disable-next-line
      useCallback(
        () =>
          tableContextMenuFactory(
            dataView,
            dispatch,
            selection,
            tableState.highlightSearchSetting,
            tableState.filterSearchHistory,
            tableState.columns,
            visibleColumns,
            onCopyRows,
            onContextMenu,
            props.enableMultiPanels ? sidePanelToggle : undefined,
          ),
        [
          dataView,
          selection,
          tableState.highlightSearchSetting,
          tableState.filterSearchHistory,
          tableState.columns,
          visibleColumns,
          onCopyRows,
          onContextMenu,
          props.enableMultiPanels,
          sidePanelToggle,
        ],
      );

  const contextMenuRef = useRef(contexMenu);
  contextMenuRef.current = contexMenu;

  useEffect(function initialSetup() {
    return function cleanup() {
      // write current prefs to local storage
      savePreferences(stateRef.current, lastOffset.current);
      // if the component unmounts, we reset the SFRW pipeline to
      // avoid wasting resources in the background
      dataView.reset();
      if (props.viewId) {
        // this is a side panel
        dataSource.deleteView(props.viewId);
      }
      // clean ref && Make sure this is the main table
      if (props.tableManagerRef && !props.viewId) {
        (props.tableManagerRef as MutableRefObject<any>).current = undefined;
      }
    };
    // one-time setup and cleanup effect, everything in here is asserted to be stable:
    // dataSource, tableManager, tableManagerRef
    // eslint-disable-next-line
  }, []);

  const header = (
    <Layout.Container>
      {props.enableSearchbar && (
        <TableSearch
          searchValue={searchValue}
          useRegex={tableState.useRegex}
          filterSearchHistory={tableState.filterSearchHistory}
          showHistory={tableState.showSearchHistory}
          showNumbered={tableState.showNumberedHistory}
          dispatch={dispatch as any}
          searchHistory={tableState.searchHistory}
          contextMenu={props.enableContextMenu ? contexMenu : undefined}
          extraActions={!props.viewId ? props.extraActions : undefined}
          searchInputRef={searchInputRef}
        />
      )}
    </Layout.Container>
  );
  const columnHeaders = (
    <Layout.Container>
      {props.enableColumnHeaders && (
        <TableHead
          visibleColumns={visibleColumns}
          dispatch={dispatch as any}
          sorting={sorting}
          scrollbarSize={
            props.scrollable
              ? 0
              : 15 /* width on MacOS: TODO, determine dynamically */
          }
        />
      )}
    </Layout.Container>
  );

  const emptyRenderer =
    props.onRenderEmpty === undefined
      ? createDefaultEmptyRenderer(tableManager)
      : props.onRenderEmpty;

  let mainSection: JSX.Element;
  if (props.scrollable) {
    const dataSourceRenderer = (
      <DataSourceRendererVirtual<T, TableRowRenderContext<T>>
        dataView={dataView}
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
    );

    mainSection = props.enableHorizontalScroll ? (
      <Layout.Top>
        {header}
        <Layout.ScrollContainer horizontal vertical={false}>
          <Layout.Top>
            {columnHeaders}
            {dataSourceRenderer}
          </Layout.Top>
        </Layout.ScrollContainer>
      </Layout.Top>
    ) : (
      <Layout.Top>
        <div>
          {header}
          {columnHeaders}
        </div>
        {dataSourceRenderer}
      </Layout.Top>
    );
  } else {
    mainSection = (
      <Layout.Container>
        {header}
        {columnHeaders}
        <DataSourceRendererStatic<T, TableRowRenderContext<T>>
          dataView={dataView}
          useFixedRowHeight={!tableState.usesWrapping}
          defaultRowHeight={DEFAULT_ROW_HEIGHT}
          context={renderingConfig}
          maxRecords={dataSource.limit}
          itemRenderer={itemRenderer}
          onKeyDown={onKeyDown}
          emptyRenderer={emptyRenderer}
        />
      </Layout.Container>
    );
  }
  const mainPanel = (
    <Layout.Container grow={props.scrollable} style={{position: 'relative'}}>
      <HighlightProvider
        text={
          tableState.highlightSearchSetting.highlightEnabled
            ? tableState.searchValue
            : ''
        }
        highlightColor={
          tableState.highlightSearchSetting.color ||
          theme.searchHighlightBackground.yellow
        }>
        {mainSection}
      </HighlightProvider>
      {props.enableAutoScroll && (
        <AutoScroller>
          <PushpinFilled
            style={{
              color: tableState.autoScroll ? theme.successColor : undefined,
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
  return props.enableMultiPanels && tableState.sideBySide ? (
    //TODO: Make the panels resizable by having a dynamic maxWidth for Layout.Right/Left possibly?
    <Layout.Horizontal style={{height: '100%'}}>
      {mainPanel}
      {<DataTable<T> viewId={'1'} {...props} enableMultiPanels={false} />}
    </Layout.Horizontal>
  ) : (
    mainPanel
  );
}

DataTable.defaultProps = {
  scrollable: true,
  enableSearchbar: true,
  enableAutoScroll: false,
  enableHorizontalScroll: true,
  enableColumnHeaders: true,
  enableMultiSelect: true,
  enableContextMenu: true,
  enablePersistSettings: true,
  onRenderEmpty: undefined,
} as Partial<DataTableProps<any>>;

/* eslint-disable react-hooks/rules-of-hooks */
function normalizeDataSourceInput<T>(
  props: DataTableInput<T>,
): DataSource<T, T[keyof T] | never> {
  if (props.dataSource) {
    return props.dataSource;
  }
  if (props.records) {
    const [dataSource] = useState(() =>
      createDataSource(props.records, {key: props.recordsKey}),
    );
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

function syncRecordsToDataSource<T>(
  ds: DataSource<T, T[keyof T] | never>,
  records: readonly T[],
) {
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

function createDefaultEmptyRenderer<T>(dataTableManager?: DataTableManager<T>) {
  return (dataView?: _DataSourceView<T, T[keyof T]>) => (
    <EmptyTable dataView={dataView} dataManager={dataTableManager} />
  );
}

function EmptyTable<T>({
  dataView,
  dataManager,
}: {
  dataView?: _DataSourceView<T, T[keyof T]>;
  dataManager?: DataTableManager<T>;
}) {
  const resetFilters = useCallback(() => {
    dataManager?.resetFilters();
  }, [dataManager]);
  return (
    <Layout.Container
      center
      style={{width: '100%', padding: 40, color: theme.textColorSecondary}}>
      {dataView?.size === 0 ? (
        <>
          <CoffeeOutlined style={{fontSize: '2em', margin: 8}} />
          <Typography.Text type="secondary">No records yet</Typography.Text>
        </>
      ) : (
        <>
          <SearchOutlined style={{fontSize: '2em', margin: 8}} />
          <Typography.Text type="secondary">
            No records match the current search / filter criteria.
          </Typography.Text>
          <Typography.Text>
            <Typography.Link onClick={resetFilters}>
              Reset filters
            </Typography.Link>
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

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DataTableColumn} from './DataTable';
import {Percentage} from '../../utils/widthUtils';
import {MutableRefObject, Reducer, RefObject} from 'react';
import {DataSourceVirtualizer} from '../../data-source/index';
import produce, {castDraft, immerable, original} from 'immer';
import {theme} from '../theme';
import {DataSource, _DataSourceView} from 'flipper-plugin-core';

export type OnColumnResize = (id: string, size: number | Percentage) => void;
export type Sorting<T = any> = {
  key: keyof T;
  direction: Exclude<SortDirection, undefined>;
};
export type SearchHighlightSetting = {
  highlightEnabled: boolean;
  color: string;
};

export type SortDirection = 'asc' | 'desc' | undefined;

export type Selection = {items: ReadonlySet<number>; current: number};

const emptySelection: Selection = {
  items: new Set(),
  current: -1,
};

const MAX_HISTORY = 1000;

type PersistedState = {
  /** Active search value */
  search: string;
  useRegex: boolean;
  filterSearchHistory: boolean;
  /** current selection, describes the index index in the datasources's current output (not window!) */
  selection: {current: number; items: number[]};
  /** The currently applicable sorting, if any */
  sorting: Sorting | undefined;
  /** The default columns, but normalized */
  columns: Pick<
    DataTableColumn,
    'key' | 'width' | 'filters' | 'visible' | 'inversed'
  >[];
  scrollOffset: number;
  autoScroll: boolean;
  searchHistory: string[];
  highlightSearchSetting: SearchHighlightSetting;
};

type Action<Name extends string, Args = {}> = {type: Name} & Args;

type DataManagerActions<T> =
  /** Reset the current table preferences, including column widths an visibility, back to the default */
  | Action<'reset'>
  /** Disable the current column filters */
  | Action<'resetFilters'>
  /** Resizes the column with the given key to the given width */
  | Action<'resizeColumn', {column: keyof T; width: number | Percentage}>
  /** Sort by the given column. This toggles statefully between ascending, descending, none (insertion order of the data source) */
  | Action<'sortColumn', {column: keyof T; direction: SortDirection}>
  /** Show / hide the given column */
  | Action<'toggleColumnVisibility', {column: keyof T}>
  | Action<'setSearchValue', {value: string; addToHistory: boolean}>
  | Action<
      'selectItem',
      {
        nextIndex: number | ((currentIndex: number) => number);
        addToSelection?: boolean;
        allowUnselect?: boolean;
      }
    >
  | Action<
      'selectItemById',
      {
        id: string;
        addToSelection?: boolean;
      }
    >
  | Action<
      'addRangeToSelection',
      {
        start: number;
        end: number;
        allowUnselect?: boolean;
      }
    >
  | Action<'clearSelection', {}>
  /** Changing column filters */
  | Action<
      'addColumnFilter',
      {column: keyof T; value: string; disableOthers?: boolean}
    >
  | Action<
      'removeColumnFilter',
      | {column: keyof T; index: number; label?: never}
      | {column: keyof T; index?: never; label: string}
    >
  | Action<
      'toggleColumnFilter',
      | {column: keyof T; index: number; label?: never}
      | {column: keyof T; index?: never; label: string}
    >
  | Action<'setColumnFilterInverse', {column: keyof T; inversed: boolean}>
  | Action<'setColumnFilterFromSelection', {column: keyof T}>
  | Action<'appliedInitialScroll'>
  | Action<'toggleUseRegex'>
  | Action<'toggleAutoScroll'>
  | Action<'setAutoScroll', {autoScroll: boolean}>
  | Action<'toggleSearchValue'>
  | Action<'clearSearchHistory'>
  | Action<'toggleHighlightSearch'>
  | Action<'setSearchHighlightColor', {color: string}>
  | Action<'toggleFilterSearchHistory'>
  | Action<'toggleSideBySide'>
  | Action<'showSearchDropdown', {show: boolean}>
  | Action<'setShowNumberedHistory', {showNumberedHistory: boolean}>;

type DataManagerConfig<T> = {
  dataSource: DataSource<T, T[keyof T]>;
  dataView: _DataSourceView<T, T[keyof T]>;
  defaultColumns: DataTableColumn<T>[];
  scope: string;
  onSelect: undefined | ((item: T | undefined, items: T[]) => void);
  virtualizerRef: MutableRefObject<DataSourceVirtualizer | undefined>;
  autoScroll?: boolean;
  enablePersistSettings?: boolean;
};

export type DataManagerState<T> = {
  config: DataManagerConfig<T>;
  usesWrapping: boolean;
  storageKey: string;
  initialOffset: number;
  columns: DataTableColumn[];
  sorting: Sorting<T> | undefined;
  selection: Selection;
  useRegex: boolean;
  filterSearchHistory: boolean;
  showSearchHistory: boolean;
  showNumberedHistory: boolean;
  autoScroll: boolean;
  searchValue: string;
  /** Used to remember the record entry to lookup when user presses ctrl */
  previousSearchValue: string;
  searchHistory: string[];
  highlightSearchSetting: SearchHighlightSetting;
  sideBySide: boolean;
};

export type DataTableReducer<T> = Reducer<
  DataManagerState<T>,
  DataManagerActions<T>
>;
export type DataTableDispatch<T = any> = React.Dispatch<DataManagerActions<T>>;

export const dataTableManagerReducer = produce<
  DataManagerState<any>,
  [DataManagerActions<any>]
>(function (draft, action) {
  const config = original(draft.config)!;
  switch (action.type) {
    case 'reset': {
      draft.columns = computeInitialColumns(config.defaultColumns);
      draft.sorting = undefined;
      draft.searchValue = '';
      draft.selection = castDraft(emptySelection);
      break;
    }
    case 'resetFilters': {
      draft.columns.forEach((c) =>
        c.filters?.forEach((f) => (f.enabled = false)),
      );
      draft.searchValue = '';
      break;
    }
    case 'resizeColumn': {
      const {column, width} = action;
      const col = draft.columns.find((c) => c.key === column)!;
      col.width = width;
      break;
    }
    case 'sortColumn': {
      const {column, direction} = action;
      if (direction === undefined) {
        draft.sorting = undefined;
      } else {
        draft.sorting = {key: column, direction};
      }
      break;
    }
    case 'toggleColumnVisibility': {
      const {column} = action;
      const col = draft.columns.find((c) => c.key === column)!;
      col.visible = !col.visible;
      break;
    }
    case 'setSearchValue': {
      draft.searchValue = action.value;
      draft.previousSearchValue = '';
      if (
        action.addToHistory &&
        action.value &&
        !draft.searchHistory.includes(action.value)
      ) {
        draft.searchHistory.unshift(action.value);
        // FIFO if history too large
        if (draft.searchHistory.length > MAX_HISTORY) {
          draft.searchHistory.length = MAX_HISTORY;
        }
      }
      break;
    }
    case 'toggleSearchValue': {
      if (draft.searchValue) {
        draft.previousSearchValue = draft.searchValue;
        draft.searchValue = '';
      } else {
        draft.searchValue = draft.previousSearchValue;
        draft.previousSearchValue = '';
      }
      break;
    }
    case 'clearSearchHistory': {
      draft.searchHistory = [];
      break;
    }
    case 'toggleUseRegex': {
      draft.useRegex = !draft.useRegex;
      break;
    }
    case 'toggleFilterSearchHistory': {
      draft.filterSearchHistory = !draft.filterSearchHistory;
      break;
    }
    case 'selectItem': {
      const {nextIndex, addToSelection, allowUnselect} = action;
      draft.selection = castDraft(
        computeSetSelection(
          draft.selection,
          nextIndex,
          addToSelection,
          allowUnselect,
        ),
      );
      break;
    }
    case 'selectItemById': {
      const {id, addToSelection} = action;
      // TODO: fix that this doesn't jumpt selection if items are shifted! sorting is swapped etc
      const idx = config.dataSource.getIndexOfKey(id);
      if (idx !== -1) {
        draft.selection = castDraft(
          computeSetSelection(draft.selection, idx, addToSelection),
        );
      }
      break;
    }
    case 'addRangeToSelection': {
      const {start, end, allowUnselect} = action;
      draft.selection = castDraft(
        computeAddRangeToSelection(draft.selection, start, end, allowUnselect),
      );
      break;
    }
    case 'clearSelection': {
      draft.selection = castDraft(emptySelection);
      break;
    }
    case 'addColumnFilter': {
      addColumnFilter(
        draft.columns,
        action.column,
        action.value,
        action.disableOthers,
      );
      break;
    }
    case 'removeColumnFilter': {
      const column = draft.columns.find((c) => c.key === action.column)!;
      const index =
        action.index ??
        column.filters?.findIndex((f) => f.label === action.label!);

      if (index === undefined || index < 0) {
        break;
      }

      column.filters?.splice(index, 1);
      break;
    }
    case 'toggleColumnFilter': {
      const column = draft.columns.find((c) => c.key === action.column)!;
      const index =
        action.index ??
        column.filters?.findIndex((f) => f.label === action.label!);

      if (index === undefined || index < 0) {
        break;
      }
      const f = column.filters![index];
      f.enabled = !f.enabled;
      break;
    }
    case 'setColumnFilterInverse': {
      draft.columns.find((c) => c.key === action.column)!.inversed =
        action.inversed;
      break;
    }
    case 'setColumnFilterFromSelection': {
      const items = getSelectedItems(
        config.dataView as _DataSourceView<any, any>,
        draft.selection,
      );
      items.forEach((item, index) => {
        addColumnFilter(
          draft.columns,
          action.column,
          getValueAtPath(item, String(action.column)),
          index === 0, // remove existing filters before adding the first
        );
      });
      break;
    }
    case 'appliedInitialScroll': {
      draft.initialOffset = 0;
      break;
    }
    case 'toggleAutoScroll': {
      draft.autoScroll = !draft.autoScroll;
      break;
    }
    case 'setAutoScroll': {
      draft.autoScroll = action.autoScroll;
      break;
    }
    case 'toggleHighlightSearch': {
      draft.highlightSearchSetting.highlightEnabled =
        !draft.highlightSearchSetting.highlightEnabled;
      break;
    }
    case 'setSearchHighlightColor': {
      if (draft.highlightSearchSetting.color !== action.color) {
        draft.highlightSearchSetting.color = action.color;
      }
      break;
    }
    case 'toggleSideBySide': {
      draft.sideBySide = !draft.sideBySide;
      break;
    }
    case 'showSearchDropdown': {
      draft.showSearchHistory = action.show;
      break;
    }
    case 'setShowNumberedHistory': {
      draft.showNumberedHistory = action.showNumberedHistory;
      break;
    }
    default: {
      throw new Error('Unknown action ' + (action as any).type);
    }
  }
});

/**
 * Public only imperative convienience API for DataTable
 */
export type DataTableManager<T> = {
  reset(): void;
  resetFilters(): void;
  selectItem(
    index: number | ((currentSelection: number) => number),
    addToSelection?: boolean,
    allowUnselect?: boolean,
  ): void;
  addRangeToSelection(
    start: number,
    end: number,
    allowUnselect?: boolean,
  ): void;
  selectItemById(id: string, addToSelection?: boolean): void;
  clearSelection(): void;
  getSelectedItem(): T | undefined;
  getSelectedItems(): readonly T[];
  toggleColumnVisibility(column: keyof T): void;
  sortColumn(column: keyof T, direction?: SortDirection): void;
  setSearchValue(value: string, addToHistory?: boolean): void;
  dataView: _DataSourceView<T, T[keyof T]>;
  stateRef: RefObject<Readonly<DataManagerState<T>>>;
  toggleSearchValue(): void;
  toggleHighlightSearch(): void;
  setSearchHighlightColor(color: string): void;
  toggleSideBySide(): void;
  showSearchDropdown(show: boolean): void;
  setShowNumberedHistory(showNumberedHistory: boolean): void;
  addColumnFilter(
    column: keyof T,
    value: string,
    disableOthers?: boolean,
  ): void;
  removeColumnFilter(column: keyof T, label: string): void;
};

export function createDataTableManager<T>(
  dataView: _DataSourceView<T, T[keyof T]>,
  dispatch: DataTableDispatch<T>,
  stateRef: MutableRefObject<DataManagerState<T>>,
): DataTableManager<T> {
  return {
    reset() {
      dispatch({type: 'reset'});
    },
    resetFilters() {
      dispatch({type: 'resetFilters'});
    },
    selectItem(index: number, addToSelection = false, allowUnselect = false) {
      dispatch({
        type: 'selectItem',
        nextIndex: index,
        addToSelection,
        allowUnselect,
      });
    },
    selectItemById(id, addToSelection = false) {
      dispatch({type: 'selectItemById', id, addToSelection});
    },
    addRangeToSelection(start, end, allowUnselect = false) {
      dispatch({type: 'addRangeToSelection', start, end, allowUnselect});
    },
    clearSelection() {
      dispatch({type: 'clearSelection'});
    },
    getSelectedItem() {
      return getSelectedItem(dataView, stateRef.current.selection);
    },
    getSelectedItems() {
      return getSelectedItems(dataView, stateRef.current.selection);
    },
    toggleColumnVisibility(column) {
      dispatch({type: 'toggleColumnVisibility', column});
    },
    sortColumn(column, direction) {
      dispatch({type: 'sortColumn', column, direction});
    },
    setSearchValue(value, addToHistory = false) {
      dispatch({type: 'setSearchValue', value, addToHistory});
    },
    toggleSearchValue() {
      dispatch({type: 'toggleSearchValue'});
    },
    toggleHighlightSearch() {
      dispatch({type: 'toggleHighlightSearch'});
    },
    setSearchHighlightColor(color) {
      dispatch({type: 'setSearchHighlightColor', color});
    },
    toggleSideBySide() {
      dispatch({type: 'toggleSideBySide'});
    },
    showSearchDropdown(show) {
      dispatch({type: 'showSearchDropdown', show});
    },
    setShowNumberedHistory(showNumberedHistory) {
      dispatch({type: 'setShowNumberedHistory', showNumberedHistory});
    },
    addColumnFilter(column, value, disableOthers) {
      dispatch({type: 'addColumnFilter', column, value, disableOthers});
    },
    removeColumnFilter(column, label) {
      dispatch({type: 'removeColumnFilter', column, label});
    },
    dataView,
    stateRef,
  };
}

export function createInitialState<T>(
  config: DataManagerConfig<T>,
): DataManagerState<T> {
  // by default a table is considered to be identical if plugins, and default column names are the same
  const storageKey = `${config.scope}:DataTable:${config.defaultColumns
    .map((c) => c.key)
    .join(',')}`;
  const prefs = config.enablePersistSettings
    ? loadStateFromStorage(storageKey)
    : undefined;
  let initialColumns = computeInitialColumns(config.defaultColumns);
  if (prefs) {
    // merge prefs with the default column config
    initialColumns = produce(initialColumns, (draft) => {
      prefs.columns.forEach((pref) => {
        const existing = draft.find((c) => c.key === pref.key);
        if (existing) {
          Object.assign(existing, pref);
        }
      });
    });
  }

  const res: DataManagerState<T> = {
    config,
    storageKey,
    initialOffset: prefs?.scrollOffset ?? 0,
    usesWrapping: config.defaultColumns.some((col) => col.wrap),
    columns: initialColumns,
    sorting: prefs?.sorting,
    selection: prefs?.selection
      ? {
          current: prefs!.selection.current,
          items: new Set(prefs!.selection.items),
        }
      : emptySelection,
    searchValue: prefs?.search ?? '',
    previousSearchValue: '',
    searchHistory: prefs?.searchHistory ?? [],
    useRegex: prefs?.useRegex ?? false,
    filterSearchHistory: prefs?.filterSearchHistory ?? true,
    autoScroll: prefs?.autoScroll ?? config.autoScroll ?? false,
    highlightSearchSetting: prefs?.highlightSearchSetting ?? {
      highlightEnabled: false,
      color: theme.searchHighlightBackground.yellow,
    },
    sideBySide: false,
    showSearchHistory: false,
    showNumberedHistory: false,
  };
  // @ts-ignore
  res.config[immerable] = false; // optimization: never proxy anything in config
  Object.freeze(res.config);
  return res;
}

function addColumnFilter<T>(
  columns: DataTableColumn<T>[],
  columnId: keyof T,
  value: string,
  disableOthers: boolean = false,
): void {
  const column = columns.find((c) => c.key === columnId)!;
  const filterValue = String(value).toLowerCase();
  const existing = column.filters!.find((c) => c.value === filterValue);
  if (existing) {
    existing.enabled = true;
  } else {
    column.filters!.push({
      label: String(value),
      value: filterValue,
      enabled: true,
    });
  }
  if (disableOthers) {
    column.filters!.forEach((c) => {
      if (c.value !== filterValue) {
        c.enabled = false;
      }
    });
  }
}

export function getSelectedItem<T>(
  dataView: _DataSourceView<T, T[keyof T]>,
  selection: Selection,
): T | undefined {
  return selection.current < 0 ? undefined : dataView.get(selection.current);
}

export function getSelectedItems<T>(
  dataView: _DataSourceView<T, T[keyof T]>,
  selection: Selection,
): T[] {
  return [...selection.items]
    .sort((a, b) => a - b) // https://stackoverflow.com/a/15765283/1983583
    .map((i) => dataView.get(i))
    .filter(Boolean) as any[];
}

export function savePreferences(
  state: DataManagerState<any>,
  scrollOffset: number,
) {
  if (!state.config.scope || !state.config.enablePersistSettings) {
    return;
  }
  const prefs: PersistedState = {
    search: state.searchValue,
    useRegex: state.useRegex,
    filterSearchHistory: state.filterSearchHistory,
    selection: {
      current: state.selection.current,
      items: Array.from(state.selection.items),
    },
    sorting: state.sorting,
    columns: state.columns.map((c) => ({
      key: c.key,
      width: c.width,
      filters: c.filters,
      visible: c.visible,
      inversed: c.inversed,
    })),
    scrollOffset,
    autoScroll: state.autoScroll,
    searchHistory: state.searchHistory,
    highlightSearchSetting: state.highlightSearchSetting,
  };
  localStorage.setItem(state.storageKey, JSON.stringify(prefs));
}

function loadStateFromStorage(storageKey: string): PersistedState | undefined {
  if (!storageKey) {
    return undefined;
  }
  const state = localStorage.getItem(storageKey);
  if (!state) {
    return undefined;
  }
  try {
    return JSON.parse(state) as PersistedState;
  } catch (e) {
    // forget about this state
    return undefined;
  }
}

function computeInitialColumns(
  columns: DataTableColumn<any>[],
): DataTableColumn<any>[] {
  const visibleColumnCount = columns.filter((c) => c.visible !== false).length;
  const columnsWithoutWidth = columns.filter(
    (c) => c.visible !== false && c.width === undefined,
  ).length;

  return columns.map((c) => ({
    ...c,
    width:
      c.width ??
      // if the width is not set, and there are multiple columns with unset widths,
      // there will be multiple columns ith the same flex weight (1), meaning that
      // they will all resize a best fits in a specifc row.
      // To address that we distribute space equally
      // (this need further fine tuning in the future as with a subset of fixed columns width can become >100%)
      (columnsWithoutWidth > 1
        ? `${Math.floor(100 / visibleColumnCount)}%`
        : undefined),
    filters:
      c.filters?.map((f) => ({
        ...f,
        predefined: true,
      })) ?? [],
    visible: c.visible !== false,
  }));
}

/**
 * A somewhat primitive and unsafe way to access nested fields an object.
 * @param obj keys should only be strings
 * @param keyPath dotted string path, e.g foo.bar
 * @returns value at the key path
 */

export function getValueAtPath(obj: Record<string, any>, keyPath: string): any {
  let res = obj;
  for (const key of keyPath.split('.')) {
    if (res == null) {
      return null;
    } else {
      res = res[key];
    }
  }

  return res;
}

export function computeDataTableFilter(
  searchValue: string,
  useRegex: boolean,
  columns: DataTableColumn[],
) {
  const searchString = searchValue.toLowerCase();
  const searchRegex = useRegex ? safeCreateRegExp(searchValue) : undefined;
  // the columns with an active filter are those that have filters defined,
  // with at least one enabled
  const filteringColumns = columns.filter((c) =>
    c.filters?.some((f) => f.enabled),
  );

  if (searchValue === '' && !filteringColumns.length) {
    // unset
    return undefined;
  }

  return function dataTableFilter(item: any) {
    for (const column of filteringColumns) {
      const rowMatchesFilter = column.filters!.some(
        (f) =>
          f.enabled &&
          String(getValueAtPath(item, column.key))
            .toLowerCase()
            .includes(f.value),
      );
      if (column.inversed && rowMatchesFilter) {
        return false;
      }
      if (!column.inversed && !rowMatchesFilter) {
        return false;
      }
    }
    //free search all top level keys as well as any (nested) columns in the table
    const nestedColumns = columns
      .map((col) => col.key)
      .filter((path) => path.includes('.'));
    return [...Object.keys(item), ...nestedColumns]
      .map((key) => getValueAtPath(item, key))
      .filter((val) => typeof val !== 'object')
      .some((v) => {
        return searchRegex
          ? searchRegex.test(String(v))
          : String(v).toLowerCase().includes(searchString);
      });
  };
}

export function safeCreateRegExp(source: string): RegExp | undefined {
  try {
    return new RegExp(source);
  } catch (_e) {
    return undefined;
  }
}

export function computeSetSelection(
  base: Selection,
  nextIndex: number | ((currentIndex: number) => number),
  addToSelection?: boolean,
  allowUnselect?: boolean,
): Selection {
  const newIndex =
    typeof nextIndex === 'number' ? nextIndex : nextIndex(base.current);
  // special case: toggle existing selection off
  if (
    !addToSelection &&
    allowUnselect &&
    base.items.size === 1 &&
    base.current === newIndex
  ) {
    return emptySelection;
  }
  if (newIndex < 0) {
    return emptySelection;
  }
  if (base.current < 0 || !addToSelection) {
    return {
      current: newIndex,
      items: new Set([newIndex]),
    };
  } else {
    const lowest = Math.min(base.current, newIndex);
    const highest = Math.max(base.current, newIndex);
    return {
      current: newIndex,
      items: addIndicesToMultiSelection(base.items, lowest, highest),
    };
  }
}

export function computeAddRangeToSelection(
  base: Selection,
  start: number,
  end: number,
  allowUnselect?: boolean,
): Selection {
  // special case: unselectiong a single item with the selection
  if (start === end && allowUnselect) {
    if (base?.items.has(start)) {
      const copy = new Set(base.items);
      copy.delete(start);
      const current = [...copy];
      if (current.length === 0) {
        return emptySelection;
      }
      return {
        items: copy,
        current: current[current.length - 1], // back to the last selected one
      };
    }
    // intentional fall-through
  }

  // N.B. start and end can be reverted if selecting backwards
  const lowest = Math.min(start, end);
  const highest = Math.max(start, end);
  const current = end;

  return {
    items: addIndicesToMultiSelection(base.items, lowest, highest),
    current,
  };
}

function addIndicesToMultiSelection(
  base: ReadonlySet<number>,
  lowest: number,
  highest: number,
): ReadonlySet<number> {
  const copy = new Set(base);
  for (let i = lowest; i <= highest; i++) {
    copy.add(i);
  }
  return copy;
}

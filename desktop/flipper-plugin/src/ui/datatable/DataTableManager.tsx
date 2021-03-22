/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DataTableColumn} from './DataTable';
import {Percentage} from '../../utils/widthUtils';
import {MutableRefObject, Reducer} from 'react';
import {DataSource} from '../../state/DataSource';
import {DataSourceVirtualizer} from './DataSourceRenderer';
import produce, {castDraft, immerable, original} from 'immer';

export type OnColumnResize = (id: string, size: number | Percentage) => void;
export type Sorting<T = any> = {
  key: keyof T;
  direction: Exclude<SortDirection, undefined>;
};

export type SortDirection = 'asc' | 'desc' | undefined;

export type Selection = {items: ReadonlySet<number>; current: number};

const emptySelection: Selection = {
  items: new Set(),
  current: -1,
};

type PersistedState = {
  /** Active search value */
  search: string;
  useRegex: boolean;
  /** current selection, describes the index index in the datasources's current output (not window!) */
  selection: {current: number; items: number[]};
  /** The currently applicable sorting, if any */
  sorting: Sorting | undefined;
  /** The default columns, but normalized */
  columns: Pick<DataTableColumn, 'key' | 'width' | 'filters' | 'visible'>[];
  scrollOffset: number;
};

type Action<Name extends string, Args = {}> = {type: Name} & Args;

type DataManagerActions<T> =
  /** Reset the current table preferences, including column widths an visibility, back to the default */
  | Action<'reset'>
  /** Resizes the column with the given key to the given width */
  | Action<'resizeColumn', {column: keyof T; width: number | Percentage}>
  /** Sort by the given column. This toggles statefully between ascending, descending, none (insertion order of the data source) */
  | Action<'sortColumn', {column: keyof T; direction: SortDirection}>
  /** Show / hide the given column */
  | Action<'toggleColumnVisibility', {column: keyof T}>
  | Action<'setSearchValue', {value: string}>
  | Action<
      'selectItem',
      {
        nextIndex: number | ((currentIndex: number) => number);
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
  | Action<'removeColumnFilter', {column: keyof T; index: number}>
  | Action<'toggleColumnFilter', {column: keyof T; index: number}>
  | Action<'setColumnFilterFromSelection', {column: keyof T}>
  | Action<'appliedInitialScroll'>
  | Action<'toggleUseRegex'>;

type DataManagerConfig<T> = {
  dataSource: DataSource<T>;
  defaultColumns: DataTableColumn<T>[];
  scope: string;
  onSelect: undefined | ((item: T | undefined, items: T[]) => void);
  virtualizerRef: MutableRefObject<DataSourceVirtualizer | undefined>;
};

type DataManagerState<T> = {
  config: DataManagerConfig<T>;
  usesWrapping: boolean;
  storageKey: string;
  initialOffset: number;
  columns: DataTableColumn[];
  sorting: Sorting<T> | undefined;
  selection: Selection;
  searchValue: string;
  useRegex: boolean;
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
      break;
    }
    case 'toggleUseRegex': {
      draft.useRegex = !draft.useRegex;
      break;
    }
    case 'selectItem': {
      const {nextIndex, addToSelection} = action;
      draft.selection = castDraft(
        computeSetSelection(draft.selection, nextIndex, addToSelection),
      );
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
      draft.columns
        .find((c) => c.key === action.column)!
        .filters?.splice(action.index, 1);
      break;
    }
    case 'toggleColumnFilter': {
      const f = draft.columns.find((c) => c.key === action.column)!.filters![
        action.index
      ];
      f.enabled = !f.enabled;
      break;
    }
    case 'setColumnFilterFromSelection': {
      const items = getSelectedItems(
        config.dataSource as DataSource,
        draft.selection,
      );
      items.forEach((item, index) => {
        addColumnFilter(
          draft.columns,
          action.column,
          (item as any)[action.column],
          index === 0, // remove existing filters before adding the first
        );
      });
      break;
    }
    case 'appliedInitialScroll': {
      draft.initialOffset = 0;
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
  selectItem(
    index: number | ((currentSelection: number) => number),
    addToSelection?: boolean,
  ): void;
  addRangeToSelection(
    start: number,
    end: number,
    allowUnselect?: boolean,
  ): void;
  clearSelection(): void;
  getSelectedItem(): T | undefined;
  getSelectedItems(): readonly T[];
  toggleColumnVisibility(column: keyof T): void;
  sortColumn(column: keyof T, direction?: SortDirection): void;
  setSearchValue(value: string): void;
};

export function createDataTableManager<T>(
  dataSource: DataSource<T>,
  dispatch: DataTableDispatch<T>,
  stateRef: MutableRefObject<DataManagerState<T>>,
): DataTableManager<T> {
  return {
    reset() {
      dispatch({type: 'reset'});
    },
    selectItem(index: number, addToSelection = false) {
      dispatch({type: 'selectItem', nextIndex: index, addToSelection});
    },
    addRangeToSelection(start, end, allowUnselect = false) {
      dispatch({type: 'addRangeToSelection', start, end, allowUnselect});
    },
    clearSelection() {
      dispatch({type: 'clearSelection'});
    },
    getSelectedItem() {
      return getSelectedItem(dataSource, stateRef.current.selection);
    },
    getSelectedItems() {
      return getSelectedItems(dataSource, stateRef.current.selection);
    },
    toggleColumnVisibility(column) {
      dispatch({type: 'toggleColumnVisibility', column});
    },
    sortColumn(column, direction) {
      dispatch({type: 'sortColumn', column, direction});
    },
    setSearchValue(value) {
      dispatch({type: 'setSearchValue', value});
    },
  };
}

export function createInitialState<T>(
  config: DataManagerConfig<T>,
): DataManagerState<T> {
  const storageKey = `${config.scope}:DataTable:${config.defaultColumns
    .map((c) => c.key)
    .join(',')}`;
  const prefs = loadStateFromStorage(storageKey);
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
    useRegex: prefs?.useRegex ?? false,
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
  dataSource: DataSource<T>,
  selection: Selection,
): T | undefined {
  return selection.current < 0
    ? undefined
    : dataSource.view.get(selection.current);
}

export function getSelectedItems<T>(
  dataSource: DataSource<T>,
  selection: Selection,
): T[] {
  return [...selection.items]
    .sort()
    .map((i) => dataSource.view.get(i))
    .filter(Boolean) as any[];
}

export function savePreferences(
  state: DataManagerState<any>,
  scrollOffset: number,
) {
  if (!state.config.scope) {
    return;
  }
  const prefs: PersistedState = {
    search: state.searchValue,
    useRegex: state.useRegex,
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
    })),
    scrollOffset,
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
  return columns.map((c) => ({
    ...c,
    filters:
      c.filters?.map((f) => ({
        ...f,
        predefined: true,
      })) ?? [],
    visible: c.visible !== false,
  }));
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
      if (
        !column.filters!.some(
          (f) =>
            f.enabled &&
            String(item[column.key]).toLowerCase().includes(f.value),
        )
      ) {
        return false; // there are filters, but none matches
      }
    }
    return Object.values(item).some((v) =>
      searchRegex
        ? searchRegex.test(String(v))
        : String(v).toLowerCase().includes(searchString),
    );
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
): Selection {
  const newIndex =
    typeof nextIndex === 'number' ? nextIndex : nextIndex(base.current);
  // special case: toggle existing selection off
  if (!addToSelection && base.items.size === 1 && base.current === newIndex) {
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

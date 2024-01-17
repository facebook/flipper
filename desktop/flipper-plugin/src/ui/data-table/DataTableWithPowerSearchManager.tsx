/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {DataTableColumn} from './DataTableWithPowerSearch';
import {Percentage} from '../../utils/widthUtils';
import {MutableRefObject, Reducer, RefObject} from 'react';
import {
  DataSource,
  DataSourceView,
  DataSourceVirtualizer,
} from '../../data-source/index';
import produce, {castDraft, immerable, original} from 'immer';
import {SearchExpressionTerm} from '../PowerSearch';
import {
  dataTablePowerSearchOperators,
  PowerSearchOperatorProcessorConfig,
} from './DataTableDefaultPowerSearchOperators';
import {DataTableManager as DataTableManagerLegacy} from './DataTableManager';
import {getFlipperLib} from '../../plugin/FlipperLib';

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

type PersistedState = {
  /** Active search value */
  searchExpression: SearchExpressionTerm[];
  /** current selection, describes the index index in the datasources's current output (not window!) */
  selection: {current: number; items: number[]};
  /** The currently applicable sorting, if any */
  sorting: Sorting | undefined;
  /** The default columns, but normalized */
  columns: Pick<DataTableColumn, 'key' | 'width' | 'visible' | 'inversed'>[];
  scrollOffset: number;
  autoScroll: boolean;
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
  | Action<'setSearchExpression', {searchExpression?: SearchExpressionTerm[]}>
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
  | Action<'setSearchExpressionFromSelection', {column: DataTableColumn<T>}>
  | Action<'setFilterExceptions', {exceptions: string[] | undefined}>
  | Action<'appliedInitialScroll'>
  | Action<'toggleAutoScroll'>
  | Action<'setAutoScroll', {autoScroll: boolean}>
  | Action<'toggleSideBySide'>
  | Action<'showSearchDropdown', {show: boolean}>
  | Action<'setShowNumberedHistory', {showNumberedHistory: boolean}>;

type DataManagerConfig<T> = {
  dataSource: DataSource<T, T[keyof T]>;
  dataView: DataSourceView<T, T[keyof T]>;
  defaultColumns: DataTableColumn<T>[];
  scope: string;
  onSelect: undefined | ((item: T | undefined, items: T[]) => void);
  virtualizerRef: MutableRefObject<DataSourceVirtualizer | undefined>;
  autoScroll?: boolean;
  enablePersistSettings?: boolean;
  initialSearchExpression?: SearchExpressionTerm[];
};

export type DataManagerState<T> = {
  config: DataManagerConfig<T>;
  usesWrapping: boolean;
  storageKey: string;
  initialOffset: number;
  columns: DataTableColumn[];
  sorting: Sorting<T> | undefined;
  selection: Selection;
  autoScroll: boolean;
  searchExpression: SearchExpressionTerm[];
  filterExceptions: string[] | undefined;
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
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const config = original(draft.config)!;
  switch (action.type) {
    case 'reset': {
      draft.columns = computeInitialColumns(config.defaultColumns);
      draft.sorting = undefined;
      draft.searchExpression = [];
      draft.selection = castDraft(emptySelection);
      draft.filterExceptions = undefined;
      break;
    }
    case 'resetFilters': {
      draft.searchExpression = [];
      draft.filterExceptions = undefined;
      break;
    }
    case 'resizeColumn': {
      const {column, width} = action;
      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const col = draft.columns.find((c) => c.key === column)!;
      col.visible = !col.visible;
      break;
    }
    case 'setSearchExpression': {
      getFlipperLib().logger.track('usage', 'data-table:filter:power-search');
      draft.searchExpression = action.searchExpression ?? [];
      draft.filterExceptions = undefined;
      break;
    }
    case 'setSearchExpressionFromSelection': {
      getFlipperLib().logger.track(
        'usage',
        'data-table:filter:power-search-from-selection',
      );
      draft.filterExceptions = undefined;
      const items = getSelectedItems(
        config.dataView as DataSourceView<any, any>,
        draft.selection,
      );

      const searchExpressionFromSelection: SearchExpressionTerm[] = [
        {
          field: {
            key: action.column.key,
            label: action.column.title ?? action.column.key,
          },
          operator: dataTablePowerSearchOperators.enum_set_is_any_of({}),
          searchValue: items.map((item) =>
            getValueAtPath(item, action.column.key),
          ),
        },
      ];

      draft.searchExpression = searchExpressionFromSelection;
      draft.filterExceptions = undefined;
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
    case 'toggleSideBySide': {
      draft.sideBySide = !draft.sideBySide;
      break;
    }
    case 'setFilterExceptions': {
      draft.filterExceptions = action.exceptions;
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
  setSearchExpression(searchExpression: SearchExpressionTerm[]): void;
  dataView: DataSourceView<T, T[keyof T]>;
  stateRef: RefObject<Readonly<DataManagerState<T>>>;
  toggleSideBySide(): void;
  setFilterExceptions(exceptions: string[] | undefined): void;
} & Omit<DataTableManagerLegacy<T>, 'stateRef'>;

const showPowerSearchMigrationWarning = () => {
  console.warn(
    'Flipper is migrating to the new power search (see https://fburl.com/workplace/eewxik3o). Your plugin uses tableManagerRef which is partially incompatible with the new API. THIS API CALL DOES NOTHING AT THIS POINT! Please, migrate to the new API by explicitly using _MasterDetailWithPowerSearch, _DataTableWithPowerSearch, _DataTableWithPowerSearchManager (see https://fburl.com/code/dpawdt69). As a temporary workaround, feel free to use legacy MasterDetailLegacy, DataTableLegacy, DataTableManagerLegacy components to force the usage of the old search.',
  );
  getFlipperLib().logger.track(
    'usage',
    'data-table:filter:power-search-legacy-api-access',
  );
};

export function createDataTableManager<T>(
  dataView: DataSourceView<T, T[keyof T]>,
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
    setSearchExpression(searchExpression) {
      dispatch({type: 'setSearchExpression', searchExpression});
    },
    toggleSideBySide() {
      dispatch({type: 'toggleSideBySide'});
    },
    setFilterExceptions(exceptions: string[] | undefined) {
      dispatch({type: 'setFilterExceptions', exceptions});
    },
    dataView,
    stateRef,
    showSearchDropdown() {
      showPowerSearchMigrationWarning();
    },
    setSearchValue() {
      showPowerSearchMigrationWarning();
    },
    setSearchHighlightColor() {
      showPowerSearchMigrationWarning();
    },
    setShowNumberedHistory() {
      showPowerSearchMigrationWarning();
    },
    toggleSearchValue() {
      showPowerSearchMigrationWarning();
    },
    toggleHighlightSearch() {
      showPowerSearchMigrationWarning();
    },
    addColumnFilter() {
      showPowerSearchMigrationWarning();
    },
    removeColumnFilter() {
      showPowerSearchMigrationWarning();
    },
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

  let searchExpression = config.initialSearchExpression ?? [];
  if (prefs?.searchExpression?.length) {
    searchExpression = prefs.searchExpression;
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
          // TODO: Fix this the next time the file is edited.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          current: prefs!.selection.current,
          // TODO: Fix this the next time the file is edited.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          items: new Set(prefs!.selection.items),
        }
      : emptySelection,
    searchExpression,
    filterExceptions: undefined,
    autoScroll: prefs?.autoScroll ?? config.autoScroll ?? false,
    sideBySide: false,
  };
  // @ts-ignore
  res.config[immerable] = false; // optimization: never proxy anything in config
  Object.freeze(res.config);
  return res;
}

export function getSelectedItem<T>(
  dataView: DataSourceView<T, T[keyof T]>,
  selection: Selection,
): T | undefined {
  return selection.current < 0 ? undefined : dataView.get(selection.current);
}

export function getSelectedItems<T>(
  dataView: DataSourceView<T, T[keyof T]>,
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
    searchExpression: state.searchExpression,
    selection: {
      current: state.selection.current,
      items: Array.from(state.selection.items),
    },
    sorting: state.sorting,
    columns: state.columns.map((c) => ({
      key: c.key,
      width: c.width,
      visible: c.visible,
    })),
    scrollOffset,
    autoScroll: state.autoScroll,
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
  searchExpression: SearchExpressionTerm[],
  powerSearchProcessors: PowerSearchOperatorProcessorConfig,
  treatUndefinedValuesAsMatchingFiltering: boolean = false,
) {
  return function dataTableFilter(item: any) {
    if (!searchExpression.length) {
      return true;
    }
    return searchExpression.every((searchTerm) => {
      const value = searchTerm.field.useWholeRow
        ? item
        : getValueAtPath(item, searchTerm.field.key);

      const processor =
        powerSearchProcessors[
          searchTerm.operator.key as keyof typeof powerSearchProcessors
        ];
      if (!processor) {
        console.warn(
          'computeDataTableFilter -> processor at searchTerm.operator.key is not recognized',
          searchTerm,
          powerSearchProcessors,
        );
        return true;
      }

      try {
        const res = processor(
          searchTerm.operator,
          searchTerm.searchValue,
          value,
        );

        if (!res && !value) {
          return treatUndefinedValuesAsMatchingFiltering;
        }

        return res;
      } catch {
        return treatUndefinedValuesAsMatchingFiltering;
      }
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

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataTableColumn} from 'flipper-plugin/src/ui/datatable/DataTable';
import {Percentage} from '../../utils/widthUtils';
import produce from 'immer';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DataSource} from '../../state/datasource/DataSource';
import {useMemoize} from '../../utils/useMemoize';

export type OnColumnResize = (id: string, size: number | Percentage) => void;
export type Sorting = {
  key: string;
  direction: 'up' | 'down';
};

export type TableManager = ReturnType<typeof useDataTableManager>;

type Selection = {items: ReadonlySet<number>; current: number};

const emptySelection: Selection = {
  items: new Set(),
  current: -1,
};

/**
 * A hook that coordinates filtering, sorting etc for a DataSource
 */
export function useDataTableManager<T>(
  dataSource: DataSource<T>,
  defaultColumns: DataTableColumn<T>[],
  onSelect?: (item: T | undefined, items: T[]) => void,
) {
  const [columns, setEffectiveColumns] = useState(
    computeInitialColumns(defaultColumns),
  );
  // TODO: move selection with shifts with index < selection?
  // TODO: clear selection if out of range
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const selectionRef = useRef(selection);
  selectionRef.current = selection; // store last seen selection for fetching it later

  const [sorting, setSorting] = useState<Sorting | undefined>(undefined);
  const [searchValue, setSearchValue] = useState('');
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  const addColumnFilter = useCallback(
    (columnId: string, value: string, disableOthers = false) => {
      // TODO: fix typings
      setEffectiveColumns(
        produce((draft: DataTableColumn<any>[]) => {
          const column = draft.find((c) => c.key === columnId)!;
          const filterValue = value.toLowerCase();
          const existing = column.filters!.find((c) => c.value === filterValue);
          if (existing) {
            existing.enabled = true;
          } else {
            column.filters!.push({
              label: value,
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
        }),
      );
    },
    [],
  );

  const removeColumnFilter = useCallback((columnId: string, index: number) => {
    // TODO: fix typings
    setEffectiveColumns(
      produce((draft: DataTableColumn<any>[]) => {
        draft.find((c) => c.key === columnId)!.filters?.splice(index, 1);
      }),
    );
  }, []);

  const toggleColumnFilter = useCallback((columnId: string, index: number) => {
    // TODO: fix typings
    setEffectiveColumns(
      produce((draft: DataTableColumn<any>[]) => {
        const f = draft.find((c) => c.key === columnId)!.filters![index];
        f.enabled = !f.enabled;
      }),
    );
  }, []);

  // filter is computed by useMemo to support adding column filters etc here in the future
  const currentFilter = useMemoize(
    computeDataTableFilter,
    [searchValue, columns], // possible optimization: we only need the column filters
  );

  const reset = useCallback(() => {
    setEffectiveColumns(computeInitialColumns(defaultColumns));
    setSorting(undefined);
    setSearchValue('');
    setSelection(emptySelection);
    dataSource.reset();
  }, [dataSource, defaultColumns]);

  const resizeColumn = useCallback((id: string, width: number | Percentage) => {
    setEffectiveColumns(
      // TODO: fix typing of produce
      produce((columns: DataTableColumn<any>[]) => {
        const col = columns.find((c) => c.key === id)!;
        col.width = width;
      }),
    );
  }, []);

  const sortColumn = useCallback(
    (key: string) => {
      if (sorting?.key === key) {
        if (sorting.direction === 'down') {
          setSorting({key, direction: 'up'});
          dataSource.setReversed(true);
        } else {
          setSorting(undefined);
          dataSource.setSortBy(undefined);
          dataSource.setReversed(false);
        }
      } else {
        setSorting({
          key,
          direction: 'down',
        });
        dataSource.setSortBy(key as any);
        dataSource.setReversed(false);
      }
    },
    [dataSource, sorting],
  );

  const toggleColumnVisibility = useCallback((id: string) => {
    setEffectiveColumns(
      // TODO: fix typing of produce
      produce((columns: DataTableColumn<any>[]) => {
        const col = columns.find((c) => c.key === id)!;
        col.visible = !col.visible;
      }),
    );
  }, []);

  useEffect(
    function applyFilter() {
      dataSource.setFilter(currentFilter);
    },
    [currentFilter, dataSource],
  );

  /**
   * Select an individual item, used by mouse clicks and keyboard navigation
   * Set addToSelection if the current selection should be expanded to the given position,
   * rather than replacing the current selection.
   *
   * The nextIndex can be used to compute the new selection by basing relatively to the current selection
   */
  const selectItem = useCallback(
    (
      nextIndex: number | ((currentIndex: number) => number),
      addToSelection?: boolean,
    ) => {
      setSelection((base) =>
        computeSetSelection(base, nextIndex, addToSelection),
      );
    },
    [],
  );

  /**
   * Adds a range of items to the current seleciton (if any)
   */
  const addRangeToSelection = useCallback(
    (start: number, end: number, allowUnselect?: boolean) => {
      setSelection((base) =>
        computeAddRangeToSelection(base, start, end, allowUnselect),
      );
    },
    [],
  );

  // N.B: we really want to have stable refs for these functions,
  // to avoid that all context menus need re-render for every selection change,
  // hence the selectionRef hack
  const getSelectedItem = useCallback(() => {
    return selectionRef.current.current < 0
      ? undefined
      : dataSource.getItem(selectionRef.current.current);
  }, [dataSource]);

  const getSelectedItems = useCallback(() => {
    return [...selectionRef.current.items]
      .sort()
      .map((i) => dataSource.getItem(i))
      .filter(Boolean);
  }, [dataSource]);

  useEffect(
    function fireSelection() {
      if (onSelect) {
        const item = getSelectedItem();
        const items = getSelectedItems();
        onSelect(item, items);
      }
    },
    // selection is intentionally a dep
    [onSelect, selection, selection, getSelectedItem, getSelectedItems],
  );

  return {
    /** The default columns, but normalized */
    columns,
    /** The effective columns to be rendererd */
    visibleColumns,
    /** The currently applicable sorting, if any */
    sorting,
    /** Reset the current table preferences, including column widths an visibility, back to the default */
    reset,
    /** Resizes the column with the given key to the given width */
    resizeColumn,
    /** Sort by the given column. This toggles statefully between ascending, descending, none (insertion order of the data source) */
    sortColumn,
    /** Show / hide the given column */
    toggleColumnVisibility,
    /** Active search value */
    setSearchValue,
    /** current selection, describes the index index in the datasources's current output (not window) */
    selection,
    selectItem,
    addRangeToSelection,
    getSelectedItem,
    getSelectedItems,
    /** Changing column filters */
    addColumnFilter,
    removeColumnFilter,
    toggleColumnFilter,
  };
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
  columns: DataTableColumn[],
) {
  const searchString = searchValue.toLowerCase();
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
      String(v).toLowerCase().includes(searchString),
    );
  };
}

export function computeSetSelection(
  base: Selection,
  nextIndex: number | ((currentIndex: number) => number),
  addToSelection?: boolean,
): Selection {
  const newIndex =
    typeof nextIndex === 'number' ? nextIndex : nextIndex(base.current);
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
  // special case: unselectiong a single existing item
  if (start === end && allowUnselect) {
    if (base?.items.has(start)) {
      const copy = new Set(base.items);
      copy.delete(start);
      if (copy.size === 0) {
        return emptySelection;
      }
      return {
        items: copy,
        current: start,
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

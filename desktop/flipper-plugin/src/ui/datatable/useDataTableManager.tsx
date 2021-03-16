/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataTableColumn} from 'flipper-plugin/src/ui/datatable/DataTable';
import {Percentage} from '../utils/widthUtils';
import produce from 'immer';
import {useCallback, useMemo, useState} from 'react';
import {DataSource} from '../../state/datasource/DataSource';

export type OnColumnResize = (id: string, size: number | Percentage) => void;
export type Sorting = {
  key: string;
  direction: 'up' | 'down';
};

export type TableManager = ReturnType<typeof useDataTableManager>;

/**
 * A hook that coordinates filtering, sorting etc for a DataSource
 */
export function useDataTableManager<T extends object>(
  dataSource: DataSource<T>,
  defaultColumns: DataTableColumn<T>[],
) {
  // TODO: restore from local storage
  const [columns, setEffectiveColumns] = useState(
    computeInitialColumns(defaultColumns),
  );
  const [sorting, setSorting] = useState<Sorting | undefined>(undefined);
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  const reset = useCallback(() => {
    setEffectiveColumns(computeInitialColumns(defaultColumns));
    setSorting(undefined);
    dataSource.reset();
    // TODO: local storage
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
  };
}

function computeInitialColumns(
  columns: DataTableColumn<any>[],
): DataTableColumn<any>[] {
  return columns.map((c) => ({
    ...c,
    visible: c.visible !== false,
  }));
}

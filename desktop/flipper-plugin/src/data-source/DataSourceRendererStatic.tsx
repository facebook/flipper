/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo, useCallback, useEffect, useState} from 'react';
import {DataSourceView} from './DataSource';

import {RedrawContext} from './DataSourceRendererVirtual';

type DataSourceProps<T extends object, C> = {
  /**
   * The data view to render
   */
  dataView: DataSourceView<T, T[keyof T]>;
  /**
   * additional context that will be passed verbatim to the itemRenderer, so that it can be easily memoized
   */
  context?: C;
  /**
   * Takes care of rendering an item
   * @param item The item as stored in the dataSource
   * @param index The index of the item being rendered. The index represents the offset in the _visible_ items of the dataSource
   * @param context The optional context passed into this DataSourceRenderer
   */
  itemRenderer(item: T, index: number, context: C): React.ReactElement;
  useFixedRowHeight: boolean;
  defaultRowHeight: number;
  maxRecords: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onUpdateAutoScroll?(autoScroll: boolean): void;
  emptyRenderer?:
    | null
    | ((dataView: DataSourceView<T, T[keyof T]>) => React.ReactElement);
};

/**
 * This component is UI agnostic, and just takes care of rendering all items in the DataSource.
 * This component does not apply virtualization, so don't use it for large datasets!
 */
export const DataSourceRendererStatic: <T extends object, C>(
  props: DataSourceProps<T, C>,
) => React.ReactElement = memo(function DataSourceRendererStatic({
  dataView,
  maxRecords,
  useFixedRowHeight,
  context,
  itemRenderer,
  onKeyDown,
  emptyRenderer,
}: DataSourceProps<any, any>) {
  /**
   * Virtualization
   */
  // render scheduling
  const [, setForceUpdate] = useState(0);

  const redraw = useCallback(() => {
    setForceUpdate((x) => x + 1);
  }, []);

  useEffect(
    function subscribeToDataSource() {
      let unmounted = false;

      dataView.setWindow(0, maxRecords);
      const unsubscribe = dataView.addListener((_event) => {
        if (unmounted) {
          return;
        }
        setForceUpdate((x) => x + 1);
      });

      return () => {
        unmounted = true;
        unsubscribe();
      };
    },
    [dataView, maxRecords, setForceUpdate, useFixedRowHeight],
  );

  useEffect(() => {
    // initial virtualization is incorrect because the parent ref is not yet set, so trigger render after mount
    setForceUpdate((x) => x + 1);
  }, [setForceUpdate]);

  /**
   * Rendering
   */
  const records = dataView.output();
  if (records.length > 500) {
    console.warn(
      "StaticDataSourceRenderer should only be used on small datasets. For large datasets the 'scrollable' flag should enabled on DataTable",
    );
  }

  return (
    <RedrawContext.Provider value={redraw}>
      <div onKeyDown={onKeyDown} tabIndex={0}>
        {records.length === 0
          ? emptyRenderer?.(dataView)
          : records.map((item, index) => (
              <div key={index}>{itemRenderer(item, index, context)}</div>
            ))}
      </div>
    </RedrawContext.Provider>
  );
}) as any;

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';
import {TableRow, DEFAULT_ROW_HEIGHT} from './TableRow';
import {Property} from 'csstype';
import {DataSource} from '../../state/datasource/DataSource';
import {useVirtual} from 'react-virtual';
import styled from '@emotion/styled';
import {theme} from '../theme';

// how fast we update if updates are low-prio (e.g. out of window and not super significant)
const DEBOUNCE = 500; //ms

interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[];
  dataSource: DataSource<T, any, any>;
  zebra?: boolean;
  autoScroll?: boolean;
}

export type DataTableColumn<T> = (
  | {
      // existing data
      key: keyof T;
    }
  | {
      // derived data / custom rendering
      key: string;
      onRender?: (row: T) => React.ReactNode;
    }
) & {
  label?: string;
  width?: number | '*';
  wrap?: boolean;
  align?: Property.JustifyContent;
  defaultVisible?: boolean;
};

export interface RenderingConfig<T extends object> {
  columns: DataTableColumn<T>[];
  zebra: boolean;
  onMouseDown: (e: React.MouseEvent, row: T) => void;
  onMouseEnter: (e: React.MouseEvent, row: T) => void;
}

enum UpdatePrio {
  NONE,
  LOW,
  HIGH,
}

export const DataTable: <T extends object>(
  props: DataTableProps<T>,
) => React.ReactElement = memo(function DataSourceRenderer(
  props: DataTableProps<any>,
) {
  const {dataSource} = props;

  const renderingConfig = useMemo(() => {
    return {
      columns: props.columns,
      zebra: props.zebra !== false,
      onMouseDown() {
        // TODO:
      },
      onMouseEnter() {
        // TODO:
      },
    };
  }, [props.columns, props.zebra]);

  const usesWrapping = useMemo(() => props.columns.some((col) => col.wrap), [
    props.columns,
  ]);

  /**
   * Virtualization
   */
  // render scheduling
  const renderPending = useRef(UpdatePrio.NONE);
  const lastRender = useRef(Date.now());
  const setForceUpdate = useState(0)[1];

  const parentRef = React.useRef<null | HTMLDivElement>(null);

  const virtualizer = useVirtual({
    size: dataSource.output.length,
    parentRef,
    // eslint-disable-next-line
    estimateSize: useCallback(() => DEFAULT_ROW_HEIGHT, []),
    overscan: 0,
  });

  useEffect(
    function subscribeToDataSource() {
      const forceUpdate = () => {
        if (unmounted) {
          return;
        }
        setForceUpdate((x) => x + 1);
      };

      let unmounted = false;
      let timeoutHandle: NodeJS.Timeout | undefined = undefined;

      function rerender(prio: 1 | 2) {
        if (renderPending.current >= prio) {
          // already scheduled an update with equal or higher prio
          return;
        }
        renderPending.current = prio;
        if (prio === UpdatePrio.LOW) {
          // TODO: make DEBOUNCE depend on how big the relative change is
          timeoutHandle = setTimeout(forceUpdate, DEBOUNCE);
        } else {
          // High
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          requestAnimationFrame(forceUpdate);
        }
      }

      dataSource.setOutputChangeListener((event) => {
        switch (event.type) {
          case 'reset':
            rerender(UpdatePrio.HIGH);
            break;
          case 'shift':
            // console.log(event.type, event.location);
            if (event.location === 'in') {
              rerender(UpdatePrio.HIGH);
            } else {
              // optimization: we don't want to listen to every count change, especially after window
              // and in some cases before window
              rerender(UpdatePrio.LOW);
            }
            break;
          case 'update':
            // in visible range, so let's force update
            rerender(UpdatePrio.HIGH);
            break;
        }
      });

      return () => {
        unmounted = true;
        dataSource.setOutputChangeListener(undefined);
      };
    },
    [dataSource, setForceUpdate],
  );

  useLayoutEffect(function updateWindow() {
    const start = virtualizer.virtualItems[0]?.index ?? 0;
    const end = start + virtualizer.virtualItems.length;
    dataSource.setWindow(start, end);
  });

  /**
   * Scrolling
   */
  // if true, scroll if new items are appended
  const followOutput = useRef(false);
  // if true, the next scroll event will be fired as result of a size change,
  // ignore it
  const suppressScroll = useRef(false);
  suppressScroll.current = true;

  const onScroll = useCallback(() => {
    // scroll event is firing as a result of painting new items?
    if (suppressScroll.current) {
      return;
    }
    const elem = parentRef.current!;
    // make bottom 1/3 of screen sticky
    if (elem.scrollTop < elem.scrollHeight - elem.clientHeight * 1.3) {
      followOutput.current = false;
    } else {
      followOutput.current = true;
    }
  }, []);

  useLayoutEffect(function scrollToEnd() {
    if (followOutput.current) {
      virtualizer.scrollToIndex(
        dataSource.output.length - 1,
        /* smooth is not typed by react-virtual, but passed on to the DOM as it should*/
        {
          align: 'end',
          behavior: 'smooth',
        } as any,
      );
    }
  });

  /**
   * Render finalization
   */
  useEffect(function renderCompleted() {
    suppressScroll.current = false;
    renderPending.current = UpdatePrio.NONE;
    lastRender.current = Date.now();
  });

  /**
   * Rendering
   */
  return (
    <TableContainer onScroll={onScroll} ref={parentRef}>
      <TableWindow height={virtualizer.totalSize}>
        {virtualizer.virtualItems.map((virtualRow) => (
          // the position properties always change, so they are not part of the TableRow to avoid invalidating the memoized render always.
          // Also all row containers are renderd as part of same component to have 'less react' framework code in between*/}
          <div
            key={virtualRow.index}
            className={virtualRow.index % 2 ? 'ListItemOdd' : 'ListItemEven'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              backgroundColor:
                renderingConfig.zebra && virtualRow.index % 2
                  ? theme.backgroundWash
                  : theme.backgroundDefault,
              height: usesWrapping ? undefined : virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
            ref={usesWrapping ? virtualRow.measureRef : undefined}>
            {
              <TableRow
                key={virtualRow.index}
                config={renderingConfig}
                row={dataSource.getItem(virtualRow.index)}
                highlighted={false}
              />
            }
          </div>
        ))}
      </TableWindow>
    </TableContainer>
  );
}) as any;

const TableContainer = styled.div({
  overflowY: 'scroll',
  overflowX: 'hidden',
  display: 'flex',
  flex: 1,
});

const TableWindow = styled.div<{height: number}>(({height}) => ({
  height,
  position: 'relative',
  width: '100%',
}));

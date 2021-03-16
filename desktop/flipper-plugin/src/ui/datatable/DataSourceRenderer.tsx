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
  useRef,
  useState,
  useLayoutEffect,
  MutableRefObject,
} from 'react';
import {DataSource} from '../../state/datasource/DataSource';
import {useVirtual} from 'react-virtual';
import styled from '@emotion/styled';

// how fast we update if updates are low-prio (e.g. out of window and not super significant)
const DEBOUNCE = 500; //ms

enum UpdatePrio {
  NONE,
  LOW,
  HIGH,
}

export type DataSourceVirtualizer = ReturnType<typeof useVirtual>;

type DataSourceProps<T extends object, C> = {
  /**
   * The data source to render
   */
  dataSource: DataSource<T, any, any>;
  /**
   * Automatically scroll if the user is near the end?
   */
  autoScroll?: boolean;
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
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  virtualizerRef?: MutableRefObject<DataSourceVirtualizer | undefined>;
  onRangeChange?(
    start: number,
    end: number,
    total: number,
    offset: number,
  ): void;
  emptyRenderer?(dataSource: DataSource<T>): React.ReactElement;
  _testHeight?: number; // exposed for unit testing only
};

/**
 * This component is UI agnostic, and just takes care of virtualizing the provided dataSource, and render it as efficiently a possibible,
 * de priorizing off screen updates etc.
 */
export const DataSourceRenderer: <T extends object, C>(
  props: DataSourceProps<T, C>,
) => React.ReactElement = memo(function DataSourceRenderer({
  dataSource,
  defaultRowHeight,
  useFixedRowHeight,
  context,
  itemRenderer,
  autoScroll,
  onKeyDown,
  virtualizerRef,
  onRangeChange,
  emptyRenderer,
  _testHeight,
}: DataSourceProps<any, any>) {
  /**
   * Virtualization
   */
  // render scheduling
  const renderPending = useRef(UpdatePrio.NONE);
  const lastRender = useRef(Date.now());
  const setForceUpdate = useState(0)[1];
  const forceHeightRecalculation = useRef(0);

  const parentRef = React.useRef<null | HTMLDivElement>(null);

  const virtualizer = useVirtual({
    size: dataSource.output.length,
    parentRef,
    useObserver: _testHeight
      ? () => ({height: _testHeight, width: 1000})
      : undefined,
    // eslint-disable-next-line
      estimateSize: useCallback(() => defaultRowHeight, [forceHeightRecalculation.current, defaultRowHeight]),
    overscan: 0,
  });
  if (virtualizerRef) {
    virtualizerRef.current = virtualizer;
  }

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

      function rerender(prio: 1 | 2, invalidateHeights = false) {
        if (invalidateHeights && !useFixedRowHeight) {
          // the height of some existing rows might have changed
          forceHeightRecalculation.current++;
        }
        if (_testHeight) {
          // test environment, update immediately
          forceUpdate();
          return;
        }
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
            rerender(UpdatePrio.HIGH, true);
            break;
          case 'shift':
            if (event.location === 'in') {
              rerender(UpdatePrio.HIGH, false);
            } else {
              // optimization: we don't want to listen to every count change, especially after window
              // and in some cases before window
              rerender(UpdatePrio.LOW, false);
            }
            break;
          case 'update':
            // in visible range, so let's force update
            rerender(UpdatePrio.HIGH, true);
            break;
        }
      });

      return () => {
        unmounted = true;
        dataSource.setOutputChangeListener(undefined);
      };
    },
    [dataSource, setForceUpdate, useFixedRowHeight, _testHeight],
  );

  useEffect(() => {
    // initial virtualization is incorrect because the parent ref is not yet set, so trigger render after mount
    setForceUpdate((x) => x + 1);
  }, [setForceUpdate]);

  useLayoutEffect(function updateWindow() {
    const start = virtualizer.virtualItems[0]?.index ?? 0;
    const end = start + virtualizer.virtualItems.length;
    if (start !== dataSource.windowStart && !followOutput.current) {
      onRangeChange?.(
        start,
        end,
        dataSource.output.length,
        parentRef.current?.scrollTop ?? 0,
      );
    }
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
    if (suppressScroll.current || !autoScroll) {
      return;
    }
    const elem = parentRef.current!;
    // make bottom 1/3 of screen sticky
    if (elem.scrollTop < elem.scrollHeight - elem.clientHeight * 1.3) {
      followOutput.current = false;
    } else {
      followOutput.current = true;
    }
  }, [autoScroll, parentRef]);

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
      {virtualizer.virtualItems.length === 0
        ? emptyRenderer?.(dataSource)
        : null}
      <TableWindow
        height={virtualizer.totalSize}
        onKeyDown={onKeyDown}
        tabIndex={0}>
        {virtualizer.virtualItems.map((virtualRow) => {
          const entry = dataSource.getEntry(virtualRow.index);
          // the position properties always change, so they are not part of the TableRow to avoid invalidating the memoized render always.
          // Also all row containers are renderd as part of same component to have 'less react' framework code in between*/}
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: useFixedRowHeight ? virtualRow.size : undefined,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              ref={useFixedRowHeight ? undefined : virtualRow.measureRef}>
              {itemRenderer(entry.value, virtualRow.index, context)}
            </div>
          );
        })}
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

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
  useContext,
  createContext,
} from 'react';
import {DataSource} from '../../state/DataSource';
import {useVirtual} from 'react-virtual';
import styled from '@emotion/styled';
import observeRect from '@reach/observe-rect';
import {useInUnitTest} from '../../utils/useInUnitTest()';

// how fast we update if updates are low-prio (e.g. out of window and not super significant)
const LOW_PRIO_UPDATE = 1000; //ms
const HIGH_PRIO_UPDATE = 40; // 25fps
const SMALL_DATASET = 1000; // what we consider a small dataset, for which we keep all updates snappy

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
  onUpdateAutoScroll?(autoScroll: boolean): void;
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
  onUpdateAutoScroll,
  emptyRenderer,
}: DataSourceProps<any, any>) {
  /**
   * Virtualization
   */
  // render scheduling
  const renderPending = useRef(UpdatePrio.NONE);
  const lastRender = useRef(Date.now());
  const [, setForceUpdate] = useState(0);
  const forceHeightRecalculation = useRef(0);
  const parentRef = React.useRef<null | HTMLDivElement>(null);
  const isUnitTest = useInUnitTest();

  const virtualizer = useVirtual({
    size: dataSource.view.size,
    parentRef,
    useObserver: isUnitTest ? () => ({height: 500, width: 1000}) : undefined,
    // eslint-disable-next-line
      estimateSize: useCallback(() => defaultRowHeight, [forceHeightRecalculation.current, defaultRowHeight]),
    overscan: 0,
  });
  if (virtualizerRef) {
    virtualizerRef.current = virtualizer;
  }

  const redraw = useCallback(() => {
    forceHeightRecalculation.current++;
    setForceUpdate((x) => x + 1);
  }, []);

  useEffect(
    function subscribeToDataSource() {
      const forceUpdate = () => {
        if (unmounted) {
          return;
        }
        timeoutHandle = undefined;
        setForceUpdate((x) => x + 1);
      };

      let unmounted = false;
      let timeoutHandle: NodeJS.Timeout | undefined = undefined;

      function rerender(prio: 1 | 2, invalidateHeights = false) {
        if (invalidateHeights && !useFixedRowHeight) {
          // the height of some existing rows might have changed
          forceHeightRecalculation.current++;
        }
        if (isUnitTest) {
          // test environment, update immediately
          forceUpdate();
          return;
        }
        if (renderPending.current >= prio) {
          // already scheduled an update with equal or higher prio
          return;
        }
        renderPending.current = Math.max(renderPending.current, prio);
        if (prio === UpdatePrio.LOW) {
          // Possible optimization: make DEBOUNCE depend on how big the relative change is, and how far from the current window
          if (!timeoutHandle) {
            timeoutHandle = setTimeout(forceUpdate, LOW_PRIO_UPDATE);
          }
        } else {
          // High, drop low prio timeout
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = undefined;
          }
          if (lastRender.current < Date.now() - HIGH_PRIO_UPDATE) {
            forceUpdate(); // trigger render now
          } else {
            // debounced
            timeoutHandle = setTimeout(forceUpdate, HIGH_PRIO_UPDATE);
          }
        }
      }

      dataSource.view.setListener((event) => {
        switch (event.type) {
          case 'reset':
            rerender(UpdatePrio.HIGH, true);
            break;
          case 'shift':
            if (dataSource.view.size < SMALL_DATASET) {
              rerender(UpdatePrio.HIGH, false);
            } else if (
              event.location === 'in' ||
              // to support smooth tailing we want to render on records directly at the end of the window immediately as well
              (event.location === 'after' &&
                event.delta > 0 &&
                event.index === dataSource.view.windowEnd)
            ) {
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
        dataSource.view.setListener(undefined);
      };
    },
    [dataSource, setForceUpdate, useFixedRowHeight, isUnitTest],
  );

  useEffect(() => {
    // initial virtualization is incorrect because the parent ref is not yet set, so trigger render after mount
    setForceUpdate((x) => x + 1);
  }, [setForceUpdate]);

  useLayoutEffect(function updateWindow() {
    const start = virtualizer.virtualItems[0]?.index ?? 0;
    const end = start + virtualizer.virtualItems.length;
    if (start !== dataSource.view.windowStart && !autoScroll) {
      onRangeChange?.(
        start,
        end,
        dataSource.view.size,
        parentRef.current?.scrollTop ?? 0,
      );
    }
    dataSource.view.setWindow(start, end);
  });

  /**
   * Scrolling
   */
  const onScroll = useCallback(() => {
    const elem = parentRef.current;
    if (!elem) {
      return;
    }
    const fromEnd = elem.scrollHeight - elem.scrollTop - elem.clientHeight;
    if (autoScroll && fromEnd > 1) {
      onUpdateAutoScroll?.(false);
    } else if (!autoScroll && fromEnd < 1) {
      onUpdateAutoScroll?.(true);
    }
  }, [onUpdateAutoScroll, autoScroll]);

  useLayoutEffect(function scrollToEnd() {
    if (autoScroll) {
      virtualizer.scrollToIndex(
        dataSource.view.size - 1,
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
    renderPending.current = UpdatePrio.NONE;
    lastRender.current = Date.now();
  });

  /**
   * Observer parent height
   */
  useEffect(
    function redrawOnResize() {
      if (!parentRef.current) {
        return;
      }

      let lastWidth = 0;
      const observer = observeRect(parentRef.current, (rect) => {
        if (lastWidth !== rect.width) {
          lastWidth = rect.width;
          redraw();
        }
      });
      observer.observe();
      return () => observer.unobserve();
    },
    [redraw],
  );

  /**
   * Rendering
   */
  return (
    <RedrawContext.Provider value={redraw}>
      <TableContainer ref={parentRef} onScroll={onScroll}>
        {virtualizer.virtualItems.length === 0
          ? emptyRenderer?.(dataSource)
          : null}
        <TableWindow
          height={virtualizer.totalSize}
          onKeyDown={onKeyDown}
          tabIndex={0}>
          {virtualizer.virtualItems.map((virtualRow) => {
            const value = dataSource.view.get(virtualRow.index);
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
                {itemRenderer(value, virtualRow.index, context)}
              </div>
            );
          })}
        </TableWindow>
      </TableContainer>
    </RedrawContext.Provider>
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

export const RedrawContext = createContext<undefined | (() => void)>(undefined);

export function useTableRedraw() {
  return useContext(RedrawContext);
}

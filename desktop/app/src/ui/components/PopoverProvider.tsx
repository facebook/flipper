/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
  useRef,
  RefObject,
} from 'react';
import React from 'react';
import {styled, colors} from 'flipper';
import {useWindowSize} from '../../utils/useWindowSize';

type PopoverManager = {
  open(
    id: string,
    targetRef: RefObject<HTMLElement | null>,
    content: ReactNode,
  ): void;
  close(id: string): void;
};
type Popover = {
  id: string;
  targetRef: RefObject<HTMLElement | null>;
  content: ReactNode;
};

const Anchor = styled.img((props: {top: number; left: number}) => ({
  zIndex: 9999999,
  position: 'absolute',
  top: props.top,
  left: props.left,
}));
Anchor.displayName = 'Popover.Anchor';
const ANCHOR_WIDTH = 34;

const PopoverContainer = styled('div')(
  (props: {left: number; top: number; hidden: boolean}) => ({
    position: 'absolute',
    top: props.top,
    left: props.left,
    zIndex: 9999998,
    backgroundColor: colors.white,
    borderRadius: 7,
    border: '1px solid rgba(0,0,0,0.3)',
    boxShadow: '0 2px 10px 0 rgba(0,0,0,0.3)',
    display: props.hidden ? 'none' : 'visible',
  }),
);
PopoverContainer.displayName = 'Popover.PopoverContainer';

const PopoverElement = (props: {
  targetRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    if (
      dimensions?.width !== ref.current.clientWidth ||
      dimensions?.height !== ref.current.clientHeight
    ) {
      setDimensions({
        width: ref.current?.clientWidth,
        height: ref.current?.clientHeight,
      });
    }
  });

  const windowSize = useWindowSize();
  if (
    windowSize.height == null ||
    windowSize.width == null ||
    props.targetRef.current?.getBoundingClientRect() == null
  ) {
    return null;
  }

  // target is the point that the anchor points to.
  // It is defined as the center of the bottom edge of the target element.
  const targetXCoord =
    props.targetRef.current?.getBoundingClientRect().left +
    props.targetRef.current?.getBoundingClientRect().width / 2;
  const targetYCoord = props.targetRef.current?.getBoundingClientRect().bottom;
  return (
    <>
      <Anchor
        top={targetYCoord}
        left={targetXCoord - ANCHOR_WIDTH / 2}
        src="./anchor.svg"
        key="anchor"
      />
      <PopoverContainer
        ref={ref}
        hidden={ref.current === null}
        top={
          Math.min(
            targetYCoord,
            windowSize.height - (dimensions?.height ?? 0),
          ) + 13
        }
        left={Math.min(
          targetXCoord - (dimensions?.width ?? 0) / 2,
          windowSize.width - (dimensions?.width ?? 0),
        )}>
        {props.children}
      </PopoverContainer>
    </>
  );
};

export const PopoverContext = createContext<PopoverManager>(undefined as any);

export function PopoverProvider({children}: {children: React.ReactNode}) {
  const [popovers, setPopovers] = useState<Popover[]>([]);
  const popoverManager = useMemo(
    () => ({
      open: (
        id: string,
        targetRef: RefObject<HTMLElement | null>,
        content: ReactNode,
      ) => {
        setPopovers((s) => [...s, {id, targetRef: targetRef, content}]);
      },
      close: (id: string) => {
        setPopovers((s) => s.filter((p) => p.id !== id));
      },
    }),
    [],
  );
  return (
    <>
      {popovers.map((p, index) => (
        <PopoverElement key={index} targetRef={p.targetRef}>
          {p.content}
        </PopoverElement>
      ))}
      <PopoverContext.Provider value={popoverManager}>
        {children}
      </PopoverContext.Provider>
    </>
  );
}

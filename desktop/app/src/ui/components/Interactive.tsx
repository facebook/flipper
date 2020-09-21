/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Rect} from '../../utils/geometry';
import LowPassFilter from '../../utils/LowPassFilter';
import {
  getDistanceTo,
  maybeSnapLeft,
  maybeSnapTop,
  SNAP_SIZE,
} from '../../utils/snap';
import styled from '@emotion/styled';
import invariant from 'invariant';
import React from 'react';

const WINDOW_CURSOR_BOUNDARY = 5;

type CursorState = {
  top: number;
  left: number;
};

type ResizingSides =
  | {
      left?: boolean;
      top?: boolean;
      bottom?: boolean;
      right?: boolean;
    }
  | null
  | undefined;

const ALL_RESIZABLE: ResizingSides = {
  bottom: true,
  left: true,
  right: true,
  top: true,
};

type InteractiveProps = {
  isMovableAnchor?: (event: React.MouseEvent) => boolean;
  onMoveStart?: () => void;
  onMoveEnd?: () => void;
  onMove?: (top: number, left: number, event: MouseEvent) => void;
  id?: string;
  movable?: boolean;
  hidden?: boolean;
  moving?: boolean;
  grow?: boolean;
  siblings?: Partial<{[key: string]: Rect}>;
  updateCursor?: (cursor?: string | null | undefined) => void;
  zIndex?: number;
  top?: number;
  left?: number;
  minTop?: number;
  minLeft?: number;
  width?: number | string;
  height?: number | string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onCanResize?: (sides: ResizingSides) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onResize?: (width: number, height: number) => void;
  resizing?: boolean;
  resizable?: boolean | ResizingSides;
  innerRef?: (elem: HTMLElement | null) => void;
  style?: Object;
  className?: string;
  children?: React.ReactNode;
  gutterWidth?: number;
};

type InteractiveState = {
  moving: boolean;
  movingInitialProps: InteractiveProps | null | undefined;
  movingInitialCursor: CursorState | null | undefined;
  cursor: string | undefined;
  resizingSides: ResizingSides;
  couldResize: boolean;
  resizing: boolean;
  resizingInitialRect: Rect | null | undefined;
  resizingInitialCursor: CursorState | null | undefined;
};

const InteractiveContainer = styled.div({
  willChange: 'transform, height, width, z-index',
});
InteractiveContainer.displayName = 'Interactive:InteractiveContainer';

export default class Interactive extends React.Component<
  InteractiveProps,
  InteractiveState
> {
  constructor(props: InteractiveProps, context: Object) {
    super(props, context);

    this.state = {
      couldResize: false,
      cursor: undefined,
      moving: false,
      movingInitialCursor: null,
      movingInitialProps: null,
      resizing: false,
      resizingInitialCursor: null,
      resizingInitialRect: null,
      resizingSides: null,
    };

    this.globalMouse = false;
  }

  globalMouse: boolean;
  ref?: HTMLElement | null;

  nextTop?: number | null;
  nextLeft?: number | null;
  nextEvent?: MouseEvent | null;

  static defaultProps = {
    minHeight: 0,
    minLeft: 0,
    minTop: 0,
    minWidth: 0,
  };

  onMouseMove = (event: MouseEvent) => {
    if (this.state.moving) {
      this.calculateMove(event);
    } else if (this.state.resizing) {
      this.calculateResize(event);
    } else {
      this.calculateResizable(event);
    }
  };

  startAction = (event: React.MouseEvent) => {
    this.globalMouse = true;
    window.addEventListener('pointerup', this.endAction, {passive: true});
    window.addEventListener('pointermove', this.onMouseMove, {passive: true});

    const {isMovableAnchor} = this.props;
    if (isMovableAnchor && isMovableAnchor(event)) {
      this.startTitleAction(event);
    } else {
      this.startWindowAction(event);
    }
  };

  startTitleAction(event: React.MouseEvent) {
    if (this.state.couldResize) {
      this.startResizeAction(event);
    } else if (this.props.movable === true) {
      this.startMoving(event);
    }
  }

  startMoving(event: React.MouseEvent) {
    const {onMoveStart} = this.props;
    if (onMoveStart) {
      onMoveStart();
    }

    if (this.context.os) {
      // pause OS timers to avoid lag when dragging
      this.context.os.timers.pause();
    }

    const topLpf = new LowPassFilter();
    const leftLpf = new LowPassFilter();

    this.nextTop = null;
    this.nextLeft = null;
    this.nextEvent = null;

    const onFrame = () => {
      if (!this.state.moving) {
        return;
      }

      const {nextEvent, nextTop, nextLeft} = this;
      if (nextEvent && nextTop != null && nextLeft != null) {
        if (topLpf.hasFullBuffer()) {
          const newTop = topLpf.next(nextTop);
          const newLeft = leftLpf.next(nextLeft);
          this.move(newTop, newLeft, nextEvent);
        } else {
          this.move(nextTop, nextLeft, nextEvent);
        }
      }

      requestAnimationFrame(onFrame);
    };

    this.setState(
      {
        cursor: 'move',
        moving: true,
        movingInitialCursor: {
          left: event.clientX,
          top: event.clientY,
        },
        movingInitialProps: this.props,
      },
      onFrame,
    );
  }

  getPossibleTargetWindows(rect: Rect) {
    const closeWindows = [];

    const {siblings} = this.props;
    if (siblings) {
      for (const key in siblings) {
        if (key === this.props.id) {
          // don't target ourselves
          continue;
        }

        const win = siblings[key];
        if (win) {
          const distance = getDistanceTo(rect, win);
          if (distance <= SNAP_SIZE) {
            closeWindows.push(win);
          }
        }
      }
    }

    return closeWindows;
  }

  startWindowAction(event: React.MouseEvent) {
    if (this.state.couldResize) {
      this.startResizeAction(event);
    }
  }

  startResizeAction(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const {onResizeStart} = this.props;
    if (onResizeStart) {
      onResizeStart();
    }

    this.setState({
      resizing: true,
      resizingInitialCursor: {
        left: event.clientX,
        top: event.clientY,
      },
      resizingInitialRect: this.getRect(),
    });
  }

  componentDidUpdate(
    _prevProps: InteractiveProps,
    prevState: InteractiveState,
  ) {
    if (prevState.cursor !== this.state.cursor) {
      const {updateCursor} = this.props;
      if (updateCursor) {
        updateCursor(this.state.cursor);
      }
    }
  }

  resetMoving() {
    const {onMoveEnd} = this.props;
    if (onMoveEnd) {
      onMoveEnd();
    }

    if (this.context.os) {
      // resume os timers
      this.context.os.timers.resume();
    }

    this.setState({
      cursor: undefined,
      moving: false,
      movingInitialProps: undefined,
      resizingInitialCursor: undefined,
    });
  }

  resetResizing() {
    const {onResizeEnd} = this.props;
    if (onResizeEnd) {
      onResizeEnd();
    }

    this.setState({
      resizing: false,
      resizingInitialCursor: undefined,
      resizingInitialRect: undefined,
      resizingSides: undefined,
    });
  }

  componentWillUnmount() {
    this.endAction();
  }

  endAction = () => {
    this.globalMouse = false;

    window.removeEventListener('pointermove', this.onMouseMove);
    window.removeEventListener('pointerup', this.endAction);

    if (this.state.moving) {
      this.resetMoving();
    }

    if (this.state.resizing) {
      this.resetResizing();
    }
  };

  onMouseLeave = () => {
    if (!this.state.resizing && !this.state.moving) {
      this.setState({
        cursor: undefined,
      });
    }
  };

  onClick = (e: React.MouseEvent) => {
    if (this.state.couldResize) {
      e.stopPropagation();
    }
  };

  calculateMove(event: MouseEvent) {
    const {movingInitialCursor, movingInitialProps} = this.state;

    invariant(movingInitialProps, 'TODO');
    invariant(movingInitialCursor, 'TODO');

    const {clientX: cursorLeft, clientY: cursorTop} = event;

    const movedLeft = movingInitialCursor!.left - cursorLeft;
    const movedTop = movingInitialCursor!.top - cursorTop;

    let newLeft = (movingInitialProps!.left || 0) - movedLeft;
    let newTop = (movingInitialProps!.top || 0) - movedTop;

    if (event.altKey) {
      const snapProps = this.getRect();
      const windows = this.getPossibleTargetWindows(snapProps);
      newLeft = maybeSnapLeft(snapProps, windows, newLeft);
      newTop = maybeSnapTop(snapProps, windows, newTop);
    }

    this.nextTop = newTop;
    this.nextLeft = newLeft;
    this.nextEvent = event;
  }

  resize(width: number, height: number) {
    if (width === this.props.width && height === this.props.height) {
      // noop
      return;
    }

    const {onResize} = this.props;
    if (!onResize) {
      return;
    }

    width = Math.max(this.props.minWidth || 0, width);
    height = Math.max(this.props.minHeight || 0, height);

    const {maxHeight, maxWidth} = this.props;
    if (maxWidth != null) {
      width = Math.min(maxWidth, width);
    }
    if (maxHeight != null) {
      height = Math.min(maxHeight, height);
    }

    onResize(width, height);
  }

  move(top: number, left: number, event: MouseEvent) {
    top = Math.max(this.props.minTop || 0, top);
    left = Math.max(this.props.minLeft || 0, left);

    if (top === this.props.top && left === this.props.left) {
      // noop
      return;
    }

    const {onMove} = this.props;
    if (onMove) {
      onMove(top, left, event);
    }
  }

  calculateResize(event: MouseEvent) {
    const {
      resizingInitialCursor,
      resizingInitialRect,
      resizingSides,
    } = this.state;

    invariant(resizingInitialRect, 'TODO');
    invariant(resizingInitialCursor, 'TODO');
    invariant(resizingSides, 'TODO');

    const deltaLeft = resizingInitialCursor!.left - event.clientX;
    const deltaTop = resizingInitialCursor!.top - event.clientY;

    let newLeft = resizingInitialRect!.left;
    let newTop = resizingInitialRect!.top;

    let newWidth = resizingInitialRect!.width;
    let newHeight = resizingInitialRect!.height;

    // right
    if (resizingSides!.right === true) {
      newWidth -= deltaLeft;
    }

    // bottom
    if (resizingSides!.bottom === true) {
      newHeight -= deltaTop;
    }

    const rect = this.getRect();

    // left
    if (resizingSides!.left === true) {
      newLeft -= deltaLeft;
      newWidth += deltaLeft;

      if (this.props.movable === true) {
        // prevent from being shrunk past the minimum width
        const right = rect.left + rect.width;
        const maxLeft = right - (this.props.minWidth || 0);

        let cleanLeft = Math.max(0, newLeft);
        cleanLeft = Math.min(cleanLeft, maxLeft);
        newWidth -= Math.abs(newLeft - cleanLeft);
        newLeft = cleanLeft;
      }
    }

    // top
    if (resizingSides!.top === true) {
      newTop -= deltaTop;
      newHeight += deltaTop;

      if (this.props.movable === true) {
        // prevent from being shrunk past the minimum height
        const bottom = rect.top + rect.height;
        const maxTop = bottom - (this.props.minHeight || 0);

        let cleanTop = Math.max(0, newTop);
        cleanTop = Math.min(cleanTop, maxTop);
        newHeight += newTop - cleanTop;
        newTop = cleanTop;
      }
    }

    if (event.altKey) {
      const windows = this.getPossibleTargetWindows(rect);

      if (resizingSides!.left === true) {
        const newLeft2 = maybeSnapLeft(rect, windows, newLeft);
        newWidth += newLeft - newLeft2;
        newLeft = newLeft2;
      }

      if (resizingSides!.top === true) {
        const newTop2 = maybeSnapTop(rect, windows, newTop);
        newHeight += newTop - newTop2;
        newTop = newTop2;
      }

      if (resizingSides!.bottom === true) {
        newHeight = maybeSnapTop(rect, windows, newTop + newHeight) - newTop;
      }

      if (resizingSides!.right === true) {
        newWidth = maybeSnapLeft(rect, windows, newLeft + newWidth) - newLeft;
      }
    }

    this.move(newTop, newLeft, event);
    this.resize(newWidth, newHeight);
  }

  getRect(): Rect {
    const {props, ref} = this;
    invariant(ref, 'expected ref');

    return {
      height: ref!.offsetHeight || 0,
      left: props.left || 0,
      top: props.top || 0,
      width: ref!.offsetWidth || 0,
    };
  }

  getResizable(): ResizingSides {
    const {resizable} = this.props;

    if (resizable === true) {
      return ALL_RESIZABLE;
    } else if (resizable == null || resizable === false) {
      return;
    } else {
      return resizable;
    }
  }

  checkIfResizable(
    event: MouseEvent,
  ):
    | {
        left: boolean;
        right: boolean;
        top: boolean;
        bottom: boolean;
      }
    | undefined {
    const canResize = this.getResizable();
    if (!canResize) {
      return;
    }

    if (!this.ref) {
      return;
    }

    const {left: offsetLeft, top: offsetTop} = this.ref.getBoundingClientRect();
    const {height, width} = this.getRect();

    const x = event.clientX - offsetLeft;
    const y = event.clientY - offsetTop;

    const gutterWidth = this.props.gutterWidth || WINDOW_CURSOR_BOUNDARY;
    const atTop: boolean = y <= gutterWidth;
    const atBottom: boolean = y >= height - gutterWidth;

    const atLeft: boolean = x <= gutterWidth;
    const atRight: boolean = x >= width - gutterWidth;

    return {
      bottom: canResize.bottom === true && atBottom,
      left: canResize.left === true && atLeft,
      right: canResize.right === true && atRight,
      top: canResize.top === true && atTop,
    };
  }

  calculateResizable(event: MouseEvent) {
    const resizing = this.checkIfResizable(event);
    if (!resizing) {
      return;
    }

    const canResize = this.getResizable();
    if (!canResize) {
      return;
    }

    const {bottom, left, right, top} = resizing;
    let newCursor;

    const movingHorizontal = left || right;
    const movingVertical = top || left;

    // left
    if (left) {
      newCursor = 'ew-resize';
    }

    // right
    if (right) {
      newCursor = 'ew-resize';
    }

    // if resizing vertically and one side can't be resized then use different cursor
    if (
      movingHorizontal &&
      (canResize.left !== true || canResize.right !== true)
    ) {
      newCursor = 'col-resize';
    }

    // top
    if (top) {
      newCursor = 'ns-resize';

      // top left
      if (left) {
        newCursor = 'nwse-resize';
      }

      // top right
      if (right) {
        newCursor = 'nesw-resize';
      }
    }

    // bottom
    if (bottom) {
      newCursor = 'ns-resize';

      // bottom left
      if (left) {
        newCursor = 'nesw-resize';
      }

      // bottom right
      if (right) {
        newCursor = 'nwse-resize';
      }
    }

    // if resizing horziontally and one side can't be resized then use different cursor
    if (
      movingVertical &&
      !movingHorizontal &&
      (canResize.top !== true || canResize.bottom !== true)
    ) {
      newCursor = 'row-resize';
    }

    const resizingSides = {
      bottom,
      left,
      right,
      top,
    };

    const {onCanResize} = this.props;
    if (onCanResize) {
      onCanResize({});
    }

    this.setState({
      couldResize: Boolean(newCursor),
      cursor: newCursor,
      resizingSides,
    });
  }

  setRef = (ref: HTMLElement | null) => {
    this.ref = ref;

    const {innerRef} = this.props;
    if (innerRef) {
      innerRef(ref);
    }
  };

  onLocalMouseMove = (event: React.MouseEvent) => {
    if (!this.globalMouse) {
      this.onMouseMove(event.nativeEvent);
    }
  };

  render() {
    const {grow, height, left, movable, top, width, zIndex} = this.props;

    const style: React.CSSProperties = {
      cursor: this.state.cursor,
      zIndex: zIndex == null ? 'auto' : zIndex,
    };

    if (movable === true || top != null || left != null) {
      if (grow === true) {
        style.left = left || 0;
        style.top = top || 0;
      } else {
        style.transform = `translate3d(${left || 0}px, ${top || 0}px, 0)`;
      }
    }

    if (grow === true) {
      style.right = 0;
      style.bottom = 0;
      style.width = '100%';
      style.height = '100%';
    } else {
      style.width = width == null ? 'auto' : width;
      style.height = height == null ? 'auto' : height;
    }

    if (this.props.style) {
      Object.assign(style, this.props.style);
    }

    return (
      <InteractiveContainer
        className={this.props.className}
        hidden={this.props.hidden}
        ref={this.setRef}
        onMouseDown={this.startAction}
        onMouseMove={this.onLocalMouseMove}
        onMouseLeave={this.onMouseLeave} // eslint-disable-next-line
        onClick={this.onClick}
        style={style}>
        {this.props.children}
      </InteractiveContainer>
    );
  }
}

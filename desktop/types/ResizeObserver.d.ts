/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export interface ResizeObserver {
  new (callback: ResizeObserverCallback): ResizeObserver;
  observe: (target: Element) => void;
  unobserve: (target: Element) => void;
  disconnect: () => void;
}

interface ResizeObserverCallback {
  (entries: ResizeObserverEntry[], observer: ResizeObserver): void;
}

export interface ResizeObserverEntry {
  /**
   * @param target The Element whose size has changed.
   */
  new (target: Element): ResizeObserverEntry;

  /**
   * The Element whose size has changed.
   */
  readonly target: Element;

  /**
   * Element's content rect when ResizeObserverCallback is invoked.
   */
  readonly contentRect: DOMRectReadOnly;
}

interface DOMRectReadOnly {
  // static fromRect(other: DOMRectInit | undefined): DOMRectReadOnly;

  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;

  toJSON: () => any;
}

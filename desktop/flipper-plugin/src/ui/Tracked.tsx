/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useMemo} from 'react';
import {Children, cloneElement, createContext, useContext} from 'react';
import reactElementToJSXString from 'react-element-to-jsx-string';

export type InteractionReport = {
  // Duration of the event handler itself, not including any time the promise handler might have been pending
  duration: number;
  // Duration of the total promise chain return by the event handler.
  totalDuration: number;
  success: 1 | 0;
  error?: string;
  scope: string;
  action: string;
  componentType: string;
  event: string;
};

export type InteractionReporter = (report: InteractionReport) => void;

let globalInteractionReporter: InteractionReporter = () => {};

export function setGlobalInteractionReporter(reporter: InteractionReporter) {
  globalInteractionReporter = reporter;
}

// For unit tests only
export function resetGlobalInteractionReporter() {
  globalInteractionReporter = () => {};
}

const DEFAULT_SCOPE = 'Flipper';

const TrackingScopeContext = createContext(DEFAULT_SCOPE);

export function TrackingScope({
  scope,
  children,
}: {
  scope: string;
  children: React.ReactNode;
}) {
  const baseScope = useContext(TrackingScopeContext);
  return (
    <TrackingScopeContext.Provider
      value={baseScope === DEFAULT_SCOPE ? scope : `${baseScope}:${scope}`}>
      {children}
    </TrackingScopeContext.Provider>
  );
}

export function Tracked({
  events = 'onClick',
  children,
  action,
}: {
  /**
   * Name of the event handler properties of the child component that should be wrapped
   */
  events?: string | string[];

  /*
   * Name of the interaction describing what the user interacted with. If omitted, will take a description of the child
   */
  action?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const scope = useContext(TrackingScopeContext);
  return Children.map(children, (child: any) => {
    if (!child || typeof child !== 'object') {
      return child;
    }
    if (child.type === Tracked) return child; // avoid double trapping
    const newProps: any = {};
    (typeof events === 'string' ? [events] : events).forEach((event) => {
      const base = child.props[event];
      if (!base) {
        return;
      }
      newProps[event] = wrapInteractionHandler(
        base,
        child,
        event,
        scope,
        action,
      );
    });
    return cloneElement(child, newProps);
  }) as any;
}

export function useTrackedCallback<T extends Function>(
  action: string,
  fn: T,
  deps: any[],
): T {
  const scope = useContext(TrackingScopeContext);
  return useMemo(() => {
    return wrapInteractionHandler(fn, null, '', scope, action);
    // eslint-disable-next-line
  }, deps) as any;
}

export function wrapInteractionHandler<T extends Function>(
  fn: T,
  element: React.ReactElement | null | string,
  event: string,
  scope: string,
  action?: string,
): T {
  function report(start: number, initialEnd: number, error?: any) {
    globalInteractionReporter({
      duration: initialEnd - start,
      totalDuration: Date.now() - start,
      success: error ? 0 : 1,
      error: error ? '' + error : undefined,
      componentType:
        element === null
          ? 'unknown'
          : typeof element === 'string'
          ? element
          : describeElementType(element),
      action:
        action ??
        (element && typeof element != 'string'
          ? describeElement(element)
          : 'unknown'),
      scope,
      event,
    });
  }

  const res = function trappedInteractionHandler(this: any) {
    let res: any;
    const start = Date.now();
    const r = report.bind(null, start);
    try {
      // eslint-disable-next-line
      res = fn.apply(this, arguments);
      if (Date.now() - start > 20) {
        console.warn('Slow interaction');
      }
    } catch (e) {
      r(Date.now(), e);
      throw e;
    }
    const initialEnd = Date.now();
    if (typeof res?.then === 'function') {
      // async / promise
      res.then(
        () => r(initialEnd),
        (error: any) => r(initialEnd, error),
      );
    } else {
      // not a Promise
      r(initialEnd);
    }
    return res;
  } as any;
  res.flipperTracked = true; // Avoid double wrapping / handling, if e.g. Button is wrapped in Tracked
  return res;
}

export function describeElement(element: React.ReactElement): string {
  const describing = element.props.title ?? element.props.children;
  if (typeof describing === 'string') {
    return describing;
  }
  if (typeof element.key === 'string') {
    return element.key;
  }
  return stringifyElement(element);
}

function describeElementType(element: React.ReactElement): string {
  const t = element.type as any;
  // cases: native dom element, named (class) component, named function component, classname
  return typeof t === 'string'
    ? t
    : t?.displayName ?? t?.name ?? t?.constructor?.name ?? 'unknown';
}

export function withTrackingScope<T>(component: T): T;
export function withTrackingScope(Component: any) {
  return function WithTrackingScope(props: any) {
    const scope =
      Component.displayName ?? Component.name ?? Component.constructor?.name;
    if (!scope || typeof scope !== 'string') {
      throw new Error('Failed to find component name for trackingScope');
    }
    return (
      <TrackingScope scope={scope}>
        <Component {...props} />
      </TrackingScope>
    );
  };
}

// @ts-ignore
global.FlipperTrackingScopeContext = TrackingScopeContext;
//@ts-ignore
global.FlipperTracked = Tracked;

// @ts-ignore
global.flipperTrackInteraction = function flipperTrackInteraction(
  elementType: string,
  event: string,
  scope: string,
  action: string | React.ReactElement | null,
  fn: Function,
  ...args: any[]
): void {
  // @ts-ignore
  if (fn.flipperTracked) {
    return fn(...args);
  }
  return wrapInteractionHandler(
    fn,
    elementType,
    event,
    scope,
    !action
      ? 'unknown action'
      : typeof action === 'string'
      ? action
      : stringifyElement(action),
  )(...args);
};

function stringifyElement(element: any): string {
  if (!element) return 'unknown element';
  if (typeof element === 'string') return element;
  if (Array.isArray(element))
    return element.filter(Boolean).map(stringifyElement).join('');
  return reactElementToJSXString(element).substr(0, 200).replace(/\n/g, ' ');
}

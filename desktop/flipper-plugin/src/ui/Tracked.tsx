/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
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

// Exported for test
export function wrapInteractionHandler(
  fn: Function,
  element: React.ReactElement,
  event: string,
  scope: string,
  action?: string,
) {
  function report(start: number, initialEnd: number, error?: any) {
    globalInteractionReporter({
      duration: initialEnd - start,
      totalDuration: Date.now() - start,
      success: error ? 0 : 1,
      error: error ? '' + error : undefined,
      componentType: describeElementType(element),
      action: action ?? describeElement(element),
      scope,
      event,
    });
  }

  return function trappedInteractionHandler(this: any) {
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
  };
}

export function describeElement(element: React.ReactElement): string {
  const describing = element.props.title ?? element.props.children;
  if (typeof describing === 'string') {
    return describing;
  }
  if (typeof element.key === 'string') {
    return element.key;
  }
  return reactElementToJSXString(element).substr(0, 200).replace(/\n/g, ' ');
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
    if (!scope) {
      throw new Error('Failed to find component name for trackingScope');
    }
    return (
      <TrackingScope scope={scope}>
        <Component {...props} />
      </TrackingScope>
    );
  };
}

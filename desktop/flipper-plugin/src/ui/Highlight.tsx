/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  useEffect,
  memo,
  useState,
  useRef,
  createContext,
  useContext,
} from 'react';
import {debounce} from 'lodash';
import {theme} from './theme';

export interface HighlightManager {
  setFilter(text: string | undefined): void;
  render(text: string): React.ReactNode;
  setHighlightColor(color: string | undefined): void;
}

function createHighlightManager(
  initialText: string = '',
  initialHighlightColor: string = theme.searchHighlightBackground.yellow,
): HighlightManager {
  const callbacks = new Set<(prev: string, next: string) => void>();
  let matches = 0;
  let currentFilter = initialText;
  let currHighlightColor = initialHighlightColor;

  const Highlight: React.FC<{text: string}> = memo(({text}) => {
    const [, setUpdate] = useState(0);
    const elem = useRef<HTMLSpanElement | null>(null);
    useEffect(() => {
      function onChange(prevHighlight: string, newHighlight: string) {
        const prevIndex = text.toLowerCase().indexOf(prevHighlight);
        const newIndex = text.toLowerCase().indexOf(newHighlight);
        if (prevIndex !== newIndex || newIndex !== -1) {
          // either we had a result, and we have no longer,
          // or we still have a result, but the highlightable text changed
          if (newIndex !== -1) {
            if (++matches === 1) {
              elem.current?.parentElement?.parentElement?.scrollIntoView?.();
            }
          }
          setUpdate((s) => s + 1);
        }
      }
      callbacks.add(onChange);
      return () => {
        callbacks.delete(onChange);
      };
    }, [text]);

    const index = text.toLowerCase().indexOf(currentFilter);
    return (
      <span ref={elem}>
        {index === -1 ? (
          text
        ) : (
          <>
            {text.substr(0, index)}
            <span style={{backgroundColor: currHighlightColor}}>
              {text.substr(index, currentFilter.length)}
            </span>
            {text.substr(index + currentFilter.length)}
          </>
        )}
      </span>
    );
  });

  return {
    setFilter: debounce((text: string = '') => {
      if (currentFilter !== text) {
        matches = 0;
        const base = currentFilter;
        currentFilter = text.toLowerCase();
        callbacks.forEach((cb) => cb(base, currentFilter));
      }
    }, 100),
    render(text: string) {
      return <Highlight text={text} />;
    },
    setHighlightColor(color: string) {
      if (color !== currHighlightColor) {
        currHighlightColor = color;
        callbacks.forEach((cb) => cb(currentFilter, currentFilter));
      }
    },
  };
}

export const HighlightContext = createContext<HighlightManager>({
  setFilter(_text: string) {
    throw new Error('Cannot set the filter of a stub highlight manager');
  },
  render(text: string) {
    // stub implementation in case we render a component without a Highlight context
    return text;
  },
  setHighlightColor(_color: string) {
    throw new Error('Cannot set the color of a stub highlight manager');
  },
});

export function HighlightProvider({
  text,
  highlightColor,
  children,
}: {
  text: string | undefined;
  highlightColor?: string | undefined;
  children: React.ReactElement;
}) {
  const [highlightManager] = useState(() =>
    createHighlightManager(text, highlightColor),
  );

  useEffect(() => {
    highlightManager.setFilter(text);
  }, [text, highlightManager]);

  useEffect(() => {
    highlightManager.setHighlightColor(highlightColor);
  }, [highlightColor, highlightManager]);

  return (
    <HighlightContext.Provider value={highlightManager}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlighter(): HighlightManager {
  return useContext(HighlightContext);
}

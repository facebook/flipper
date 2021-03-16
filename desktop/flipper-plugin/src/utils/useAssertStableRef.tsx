/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useRef} from 'react';

/**
 * This hook will throw in development builds if the value passed in is unstable.
 * Use this if to make sure consumers aren't creating or changing certain props over time
 * (intentionally or accidentally)
 */
export const useAssertStableRef =
  process.env.NODE_ENV === 'development'
    ? function useAssertStableRef(value: any, prop: string) {
        const ref = useRef(value);
        if (ref.current !== value) {
          throw new Error(
            `[useAssertStableRef] An unstable reference was passed to this component as property '${prop}'. For optimization purposes we expect that this prop doesn't change over time. You might want to create the value passed to this prop outside the render closure, store it in useCallback / useMemo / useState, or set a key on the parent component`,
          );
        }
      }
    : function (_value: any, _prop: string) {
        // no-op
      };

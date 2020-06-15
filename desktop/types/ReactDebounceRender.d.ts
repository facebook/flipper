/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'react-debounce-render' {
  export default function <P>(
    component: React.ComponentType<P>,
    maxWait: number,
    options: {
      maxWait?: number;
      leading?: boolean;
      trailing?: boolean;
    },
  ): React.ComponentType<P & {ref?: (ref: React.RefObject<any>) => void}>;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {theme} from 'flipper-plugin';
import {FlipperDoctor} from 'flipper-common';
import React from 'react';

export function CodeBlock({children}: {children: string}) {
  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        padding: '2px 4px',
        background: theme.backgroundWash,
      }}>
      {children}
    </pre>
  );
}
export function List({children}: {children: React.ReactNode[]}) {
  return (
    <ul
      style={{
        marginLeft: 16,
        listStyle: 'decimal',
      }}>
      {children}
    </ul>
  );
}
List.Item = (props: {children: React.ReactNode}) => (
  <li style={{marginBottom: 8}}>{props.children}</li>
);

export function Noop() {
  return <span>Unimplemented</span>;
}

export type PropsFor<
  T extends keyof FlipperDoctor.HealthcheckResultMessageMapping,
> = FlipperDoctor.HealthcheckResultMessageMapping[T] extends []
  ? {}
  : FlipperDoctor.HealthcheckResultMessageMapping[T][0];

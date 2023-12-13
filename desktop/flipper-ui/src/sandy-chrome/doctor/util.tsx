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
import {Button, Typography} from 'antd';
import {useStore} from '../../utils/useStore';
import {toggleSettingsModal} from '../../reducers/application';

export function CliCommand({
  title,
  command,
}: {
  title?: string;
  command: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 8,
      }}>
      {title ? (
        <Typography.Text type="secondary">{title}</Typography.Text>
      ) : null}
      <Typography.Text code copyable>
        {command}
      </Typography.Text>
    </div>
  );
}

export function CodeBlock({
  children,
  size = 'm',
}: {
  children: string;
  size?: 's' | 'm';
}) {
  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        padding: '2px 4px',
        background: theme.backgroundWash,
        fontSize: size === 's' ? '0.8em' : size == 'm' ? '1em' : undefined,
      }}>
      {children}
    </pre>
  );
}
export function List({
  children,
  listStyle = 'decimal',
}: {
  children: React.ReactNode[];
  listStyle?: 'decimal' | 'distk' | 'none';
}) {
  return (
    <ul
      style={{
        marginLeft: 16,
        listStyle,
      }}>
      {children}
    </ul>
  );
}
List.Item = (props: {children: React.ReactNode}) => (
  <li style={{marginBottom: 8}}>{props.children}</li>
);

export function OpenFlippeSettingBtn() {
  const store = useStore();
  return (
    <Button
      type="link"
      style={{padding: 0, display: 'inline'}}
      onClick={() => store.dispatch(toggleSettingsModal(true))}>
      Flipper Settings
    </Button>
  );
}

export function Noop() {
  return <span>Unimplemented</span>;
}

export type PropsFor<
  T extends keyof FlipperDoctor.HealthcheckResultMessageMapping,
> = FlipperDoctor.HealthcheckResultMessageMapping[T] extends []
  ? {}
  : FlipperDoctor.HealthcheckResultMessageMapping[T][0];

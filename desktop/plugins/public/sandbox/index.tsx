/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {ChangeEvent} from 'react';
import {Button, Input, Typography, Spin, message} from 'antd';
import {
  PluginClient,
  createState,
  usePlugin,
  useValue,
  Layout,
} from 'flipper-plugin';

export type Sandbox = {
  name: string;
  value: string;
};

type ClientMethods = {
  getSandbox(): Promise<Sandbox[]>;
  setSandbox(sandbox: {sandbox: string}): Promise<SetSandboxResult>;
};

type SetSandboxResult = {result: boolean};

export function plugin(client: PluginClient<{}, ClientMethods>) {
  const sandboxes = createState<Array<Sandbox>>([]);
  const customSandbox = createState<string>('');
  const isLoadingSandboxes = createState<boolean>(false);

  client.onConnect(() => {
    isLoadingSandboxes.set(true);
    client
      .send('getSandbox', undefined)
      .then((results: Array<Sandbox>) => {
        sandboxes.set(results);
        isLoadingSandboxes.set(false);
      })
      .catch((e) => {
        console.error('[sandbox] getSandbox call failed:', e);
        isLoadingSandboxes.set(false);
        displayError(e);
      });
  });

  const onSendSandboxEnvironment = (sandbox: string) => {
    client
      .send('setSandbox', {
        sandbox,
      })
      .then((result: SetSandboxResult) => {
        if (result.result)
          displaySuccess('Update to ' + sandbox + ' successful');
        else displayError('Update to ' + sandbox + ' failed');
      })
      .catch((e) => {
        console.error('[sandbox] setSandbox call failed:', e);
        displayError(e);
      });
  };

  const onChangeSandbox = (e: ChangeEvent<HTMLInputElement>) => {
    customSandbox.set(e.target.value);
  };

  const displaySuccess = (title: string) => {
    message.success(title);
  };

  const displayError = (title: string) => {
    message.error(title);
  };

  return {
    client,
    onChangeSandbox,
    onSendSandboxEnvironment,
    customSandbox,
    sandboxes,
    isLoadingSandboxes,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const customSandbox = useValue(instance.customSandbox);
  const sandboxes = useValue(instance.sandboxes);
  const isLoadingSandboxes = useValue(instance.isLoadingSandboxes);

  return (
    <Layout.Container center pad="medium">
      <Layout.Container
        center
        gap
        style={{
          width: '350px',
        }}>
        <Typography.Text type="secondary">
          Select the environment:
        </Typography.Text>
        <Spin spinning={isLoadingSandboxes} />
        {sandboxes.map((sandbox) => (
          <Button
            key={sandbox.value}
            onClick={() => instance.onSendSandboxEnvironment(sandbox.value)}
            style={{
              width: '100%',
            }}>
            {sandbox.name}
          </Button>
        ))}
        <Typography.Text type="secondary">
          Provide custom Sandbox URL
        </Typography.Text>
        <Input.Group compact>
          <Input
            style={{
              width: 'calc(100% - 80px)',
            }}
            placeholder="e.g. unixname.sb.facebook.com"
            onChange={instance.onChangeSandbox}
            onKeyPress={(event) => {
              if (event.key === 'Enter') {
                instance.onSendSandboxEnvironment(customSandbox);
              }
            }}
          />
          <Button
            type="primary"
            onClick={() => instance.onSendSandboxEnvironment(customSandbox)}
            disabled={customSandbox == null}>
            Submit
          </Button>
        </Input.Group>
      </Layout.Container>
    </Layout.Container>
  );
}

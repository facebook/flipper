/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, ButtonGroup, Button, styled, colors} from 'flipper';
import React, {ChangeEvent} from 'react';
import {PluginClient, createState, usePlugin, useValue} from 'flipper-plugin';

export type Sandbox = {
  name: string;
  value: string;
};

type ClientMethods = {
  getSandbox(): Promise<Sandbox[]>;
  setSandbox(sandbox: {sandbox: string}): Promise<SetSandboxResult>;
};

type SetSandboxResult = {result: boolean};

const BigButton = styled(Button)({
  flexGrow: 1,
  fontSize: 24,
  padding: 20,
});

const ButtonContainer = styled(FlexColumn)({
  alignItems: 'center',
  padding: 20,
});

const TextInput = styled.input({
  border: `1px solid ${colors.light10}`,
  fontSize: '1em',
  padding: '0 5px',
  borderRight: 0,
  borderTopLeftRadius: 4,
  borderBottomLeftRadius: 4,
  flexGrow: 1,
});

const FeedbackMessage = styled.span({
  fontSize: '1.2em',
  paddingTop: '10px',
  color: 'green',
});

const TextInputLayout = styled(FlexColumn)({
  float: 'left',
  justifyContent: 'center',
  flexGrow: 1,
  borderRadius: 4,
  marginRight: 15,
  marginTop: 15,
  marginLeft: 15,
});

export function plugin(client: PluginClient<{}, ClientMethods>) {
  const sandboxes = createState<Array<Sandbox>>([]);
  const customSandbox = createState<string>('');
  const showFeedback = createState<boolean>(false);

  client.onConnect(() => {
    client
      .send('getSandbox', undefined)
      .then((results: Array<Sandbox>) => {
        sandboxes.set(results);
      })
      .catch((e) => console.error('[sandbox] getSandbox call failed:', e));
  });

  const onSendSandboxEnvironment = (sandbox: string) => {
    client
      .send('setSandbox', {
        sandbox,
      })
      .then((result: SetSandboxResult) => {
        setTimeout(() => {
          showFeedback.set(false);
        }, 3000);
        showFeedback.set(result.result);
      })
      .catch((e) => console.error('[sandbox] setSandbox call failed:', e));
  };

  const onChangeSandbox = (e: ChangeEvent<HTMLInputElement>) => {
    customSandbox.set(e.target.value);
  };

  return {
    client,
    onChangeSandbox,
    onSendSandboxEnvironment,
    customSandbox,
    sandboxes,
    showFeedback,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const customSandbox = useValue(instance.customSandbox);
  const sandboxes = useValue(instance.sandboxes);
  const showFeedback = useValue(instance.showFeedback);

  return (
    <FlexColumn>
      <TextInputLayout>
        <ButtonGroup>
          <TextInput
            type="text"
            placeholder="Sandbox URL (e.g. unixname.sb.facebook.com)"
            key="sandbox-url"
            onChange={instance.onChangeSandbox}
            onKeyPress={(event) => {
              if (event.key === 'Enter') {
                instance.onSendSandboxEnvironment(customSandbox);
              }
            }}
          />
          <Button
            key="sandbox-send"
            icon="download"
            onClick={() => instance.onSendSandboxEnvironment(customSandbox)}
            disabled={customSandbox == null}
          />
        </ButtonGroup>
        <FeedbackMessage hidden={showFeedback == false}>
          Success!
        </FeedbackMessage>
      </TextInputLayout>
      {sandboxes.map((sandbox) => (
        <ButtonContainer key={sandbox.value}>
          <BigButton
            onClick={() => instance.onSendSandboxEnvironment(sandbox.value)}>
            {sandbox.name}
          </BigButton>
        </ButtonContainer>
      ))}
    </FlexColumn>
  );
}

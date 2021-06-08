/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createState,
  Layout,
  PluginClient,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {Button, Input, message, Typography} from 'antd';
import React from 'react';

const {Text} = Typography;

type DisplayMessageResponse = {
  greeting: string;
};

/**
 * Events that can be received FROM the client application
 */
type Events = {
  triggerNotification: {
    id: number;
  };
  displayMessage: {
    msg: string;
  };
};

/**
 * Methods that can be invoked ON the client application
 */
type Methods = {
  displayMessage(payload: {message: string}): Promise<DisplayMessageResponse>;
};

export function plugin(client: PluginClient<Events, Methods>) {
  const receivedMessage = createState('');
  const prompt = createState(
    'Type a message below to see it displayed on the mobile app',
  );
  const nextMessage = createState('');

  /*
   * Process incoming messages
   */
  client.onMessage('triggerNotification', ({id}) => {
    client.showNotification({
      id: 'test-notification:' + id,
      message: 'Example Notification',
      severity: 'warning' as 'warning',
      title: 'Notification: ' + id,
    });
  });

  client.onMessage('displayMessage', ({msg}) => {
    receivedMessage.set(msg);
  });

  /*
   * Call a method of the mobile counterpart, to display a message.
   */
  async function sendMessage() {
    if (client.isConnected) {
      try {
        const response = await client.send('displayMessage', {
          message: nextMessage.get() || 'Weeeee!',
        });
        prompt.set(response.greeting || 'Nice');
        nextMessage.set('');
      } catch (e) {
        console.warn('Error returned from client', e);
        message.error('Failed to get response from client ' + e);
      }
    }
  }

  return {
    sendMessage,
    prompt,
    nextMessage,
    receivedMessage,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const prompt = useValue(instance.prompt);
  const nextMessage = useValue(instance.nextMessage);
  const receivedMessage = useValue(instance.receivedMessage);

  return (
    <Layout.Container pad center>
      <Layout.Container pad gap width={400}>
        <Text>{prompt}</Text>
        <Input
          placeholder="Message"
          value={nextMessage}
          onChange={(event) => {
            instance.nextMessage.set(event.target.value);
          }}
        />
        <Button
          onClick={() => {
            instance.sendMessage();
          }}>
          Send
        </Button>
        {receivedMessage && <Text> {receivedMessage} </Text>}
      </Layout.Container>
    </Layout.Container>
  );
}

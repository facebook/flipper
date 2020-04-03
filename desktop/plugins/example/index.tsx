/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Input, FlipperPlugin, FlexColumn, styled, Text} from 'flipper';
import React from 'react';

type DisplayMessageResponse = {
  greeting: string;
};

type Message = {
  id: number;
  msg: string | null | undefined;
};

type State = {
  prompt: string;
  message: string;
};

type PersistedState = {
  currentNotificationIds: Array<number>;
  receivedMessage: string | null;
};

const Container = styled(FlexColumn)({
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: 20,
});

export default class Example extends FlipperPlugin<State, any, PersistedState> {
  static defaultPersistedState = {
    currentNotificationIds: [],
    receivedMessage: null,
  };

  state = {
    prompt: 'Type a message below to see it displayed on the mobile app',
    message: '',
  };

  /*
   * Reducer to process incoming "send" messages from the mobile counterpart.
   */
  static persistedStateReducer(
    persistedState: PersistedState,
    method: string,
    payload: Message,
  ) {
    if (method === 'triggerNotification') {
      return Object.assign({}, persistedState, {
        currentNotificationIds: persistedState.currentNotificationIds.concat([
          payload.id,
        ]),
      });
    }
    if (method === 'displayMessage') {
      return Object.assign({}, persistedState, {
        receivedMessage: payload.msg,
      });
    }
    return persistedState;
  }

  /*
   * Callback to provide the currently active notifications.
   */
  static getActiveNotifications(persistedState: PersistedState) {
    return persistedState.currentNotificationIds.map((x: number) => {
      return {
        id: 'test-notification:' + x,
        message: 'Example Notification',
        severity: 'warning' as 'warning',
        title: 'Notification: ' + x,
      };
    });
  }

  /*
   * Call a method of the mobile counterpart, to display a message.
   */
  sendMessage() {
    this.client
      .call('displayMessage', {message: this.state.message || 'Weeeee!'})
      .then((_params: DisplayMessageResponse) => {
        this.setState({
          prompt: 'Nice',
        });
      });
  }

  render() {
    return (
      <Container>
        <Text>{this.state.prompt}</Text>
        <Input
          placeholder="Message"
          onChange={(event) => {
            this.setState({message: event.target.value});
          }}
        />
        <Button onClick={this.sendMessage.bind(this)}>Send</Button>
        {this.props.persistedState.receivedMessage && (
          <Text> {this.props.persistedState.receivedMessage} </Text>
        )}
      </Container>
    );
  }
}

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow
 */

import {Button, Input, FlipperPlugin, FlexColumn, styled, Text} from 'flipper';

type DisplayMessageResponse = {
  greeting: string,
};

type State = {
  prompt: string,
  message: string,
};

type PersistedState = {
  currentNotificationId: number,
};

const Container = styled(FlexColumn)({
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: 20,
});

export default class extends FlipperPlugin<*, State, PersistedState> {
  static title = 'Example';
  static id = 'Example';
  static icon = 'apps';

  state = {
    prompt: 'Type a message below to see it displayed on the mobile app',
    message: '',
  };

  /*
   * Reducer to process incoming "send" messages from the mobile counterpart.
   */
  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: Object,
  ): PersistedState => {
    if (method === 'triggerNotification') {
      return {
        currentNotificationId: payload.id,
      };
    }
    return persistedState || {};
  };

  /*
   * Callback to provide the currently active notifications.
   */
  static getActiveNotifications = (persistedState: PersistedState) => {
    return [
      {
        id: 'test-notification:' + persistedState.currentNotificationId,
        message: 'Example Notification',
        severity: 'warning',
        title: 'Notification: ' + persistedState.currentNotificationId,
      },
    ];
  };

  /*
   * Call a method of the mobile counterpart, to display a message.
   */
  sendMessage() {
    this.client
      .call('displayMessage', {message: this.state.message || 'Weeeee!'})
      .then((params: DisplayMessageResponse) => {
        this.setState({
          prompt: 'Nice',
        });
      });
  }

  render() {
    return (
      <Container>
        <Text>{this.state.prompt}</Text>,
        <Input
          placeholder="Message"
          onChange={event => {
            this.setState({message: event.target.value});
          }}
        />,
        <Button onClick={this.sendMessage.bind(this)}>Send</Button>,
      </Container>
    );
  }
}

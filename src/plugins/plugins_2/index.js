/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow
 */

import {SonarPlugin, Text} from 'sonar';

type GreetParams = {
  greeting: string,
};

type State = {
  greeting: string,
};

export default class extends SonarPlugin<State> {
  static title = 'Plugins';
  static id = 'Plugins_2';
  static icon = 'target';

  reducers = {
    SetGreeting(state: State, {greeting}: {greeting: string}) {
      return {
        greeting,
      };
    },
  };

  init() {
    this.state = {
      greeting: 'waiting',
    };

    this.client.call('greet').then((params: GreetParams) => {
      this.dispatchAction({type: 'SetGreeting', greeting: params.greeting});
    });
  }

  render() {
    return <Text>{this.state.greeting}</Text>;
  }
}

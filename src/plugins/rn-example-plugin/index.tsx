/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {View, FlipperPlugin, Button} from 'flipper';
import React from 'react';

type State = {};

type PersistedState = {
  count: number;
  last: any;
};

export default class RnExamplePlugin extends FlipperPlugin<
  State,
  any,
  PersistedState
> {
  static defaultPersistedState = {count: 0, last: null};

  static persistedStateReducer(
    persistedState: PersistedState,
    method: string,
    payload: any,
  ) {
    return {
      count: persistedState.count + 1,
      last: payload,
    };
  }

  state = {};

  render() {
    const {persistedState} = this.props;

    return (
      <View>
        <Button
          onClick={async () => {
            const result = await this.client.call('FromDesktop', {test: 123});
            window.alert(result.test);
          }}>
          Send message
        </Button>
        <pre>{JSON.stringify(persistedState, null, 2)}</pre>
      </View>
    );
  }
}

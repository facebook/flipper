/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {FlipperPlugin, FlexColumn} from 'flipper';
import SearchBar from './components/SearchBar';

type State = {||};

type Data = {||};

type PersistedState = {|
  data: Array<Data>,
|};

export default class extends FlipperPlugin<State, {}, PersistedState> {
  static title = 'Navigation';
  static id = 'Navigation';
  static icon = 'directions';
  static keyboardActions = ['clear'];

  static defaultPersistedState: PersistedState = {
    data: [],
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    data: Data,
  ): $Shape<PersistedState> => {
    return {
      ...persistedState,
      data: persistedState.data.concat([data]),
    };
  };

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.props.setPersistedState({data: []});
    }
  };

  navigateTo = (query: string) => {
    this.getDevice().then(device => {
      device.navigateToLocation(query);
    });
  };

  render() {
    return (
      <FlexColumn>
        <SearchBar
          onNavigate={this.navigateTo}
          onFavorite={(query: string) => {}}
        />
      </FlexColumn>
    );
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */

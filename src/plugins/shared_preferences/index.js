/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  ManagedTable,
  Text,
  Heading,
  FlexColumn,
  colors,
  FlexRow,
  DataInspector,
  styled,
} from 'sonar';
import {FlipperPlugin} from 'sonar';

const {clone} = require('lodash');

type SharedPreferencesChangeEvent = {|
  name: string,
  time: number,
  deleted: boolean,
  value: string,
|};

export type SharedPreferences = {
  [name: string]: any,
};

type SharedPreferencesState = {|
  sharedPreferences: ?SharedPreferences,
  changesList: Array<SharedPreferencesChangeEvent>,
|};

const CHANGELOG_COLUMNS = {
  event: {
    value: 'Event',
  },
  name: {
    value: 'Name',
  },
  value: {
    value: 'Value',
  },
};

const CHANGELOG_COLUMN_SIZES = {
  event: '30%',
  name: '30%',
  value: '30%',
};

const UPDATED_LABEL = <Text color={colors.lime}>Updated</Text>;
const DELETED_LABEL = <Text color={colors.cherry}>Deleted</Text>;

const InspectorColumn = styled(FlexColumn)({
  flexGrow: 0.2,
  padding: '16px',
});

const ChangelogColumn = styled(FlexColumn)({
  flexGrow: 0.8,
  padding: '16px',
});

export default class extends FlipperPlugin<SharedPreferencesState> {
  static title = 'Shared Preferences Viewer';
  static id = 'Preferences';

  state = {
    changesList: [],
    sharedPreferences: null,
  };

  reducers = {
    UpdateSharedPreferences(state: SharedPreferencesState, results: Object) {
      return {
        changesList: state.changesList,
        sharedPreferences: results.results,
      };
    },

    ChangeSharedPreferences(state: SharedPreferencesState, event: Object) {
      const sharedPreferences = {...(state.sharedPreferences || {})};
      if (event.change.deleted) {
        delete sharedPreferences[event.change.name];
      } else {
        sharedPreferences[event.change.name] = event.change.value;
      }
      return {
        changesList: [event.change, ...state.changesList],
        sharedPreferences,
      };
    },
  };

  init() {
    this.client
      .call('getSharedPreferences')
      .then((results: SharedPreferences) => {
        this.dispatchAction({results, type: 'UpdateSharedPreferences'});
      });

    this.client.subscribe(
      'sharedPreferencesChange',
      (change: SharedPreferencesChangeEvent) => {
        this.dispatchAction({change, type: 'ChangeSharedPreferences'});
      },
    );
    this.client.subscribe(
      'newSharedPreferences',
      (results: SharedPreferences) => {
        this.dispatchAction({results, type: 'UpdateSharedPreferences'});
      },
    );
  }

  onSharedPreferencesChanged = (path: Array<string>, value: any) => {
    const values = this.state.sharedPreferences;

    let newValue = value;
    if (path.length === 2 && values) {
      newValue = clone(values[path[0]]);
      newValue[path[1]] = value;
    }
    this.client
      .call('setSharedPreference', {
        preferenceName: path[0],
        preferenceValue: newValue,
      })
      .then((results: SharedPreferences) => {
        this.dispatchAction({results, type: 'UpdateSharedPreferences'});
      });
  };

  render() {
    if (this.state.sharedPreferences == null) {
      return null;
    }

    return (
      <FlexRow fill={true} scrollable={true}>
        <InspectorColumn>
          <Heading>Inspector</Heading>
          <DataInspector
            data={this.state.sharedPreferences}
            setValue={this.onSharedPreferencesChanged}
          />
        </InspectorColumn>
        <ChangelogColumn>
          <Heading>Changelog</Heading>
          <ManagedTable
            columnSizes={CHANGELOG_COLUMN_SIZES}
            columns={CHANGELOG_COLUMNS}
            rowLineHeight={26}
            rows={this.state.changesList.map((element, index) => {
              return {
                columns: {
                  event: {
                    value: element.deleted ? DELETED_LABEL : UPDATED_LABEL,
                  },
                  name: {
                    value: element.name,
                  },
                  value: {
                    value: element.value,
                  },
                },

                key: String(index),
              };
            })}
          />
        </ChangelogColumn>
      </FlexRow>
    );
  }
}

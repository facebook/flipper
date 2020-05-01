/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ManagedTable,
  Text,
  Heading,
  FlexColumn,
  colors,
  FlexRow,
  ManagedDataInspector,
  styled,
  Select,
} from 'flipper';
import {FlipperPlugin} from 'flipper';

import {clone} from 'lodash';

type SharedPreferencesChangeEvent = {|
  preferences: string,
  name: string,
  time: number,
  deleted: boolean,
  value: string,
|};

export type SharedPreferences = {|
  [name: string]: any,
|};

type SharedPreferencesEntry = {
  preferences: SharedPreferences,
  changesList: Array<SharedPreferencesChangeEvent>,
};

type SharedPreferencesMap = {
  [name: string]: SharedPreferencesEntry,
};

type SharedPreferencesState = {|
  selectedPreferences: ?string,
  sharedPreferences: SharedPreferencesMap,
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
});

const ChangelogColumn = styled(FlexColumn)({
  flexGrow: 0.8,
  paddingLeft: '16px',
});

const RootColumn = styled(FlexColumn)({
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingTop: '16px',
});

export default class extends FlipperPlugin<SharedPreferencesState> {
  state = {
    selectedPreferences: null,
    sharedPreferences: {},
  };

  reducers = {
    UpdateSharedPreferences(state: SharedPreferencesState, results: Object) {
      const update = results.update;
      const entry = state.sharedPreferences[update.name] || {changesList: []};
      entry.preferences = update.preferences;
      state.sharedPreferences[update.name] = entry;
      return {
        ...state,
        selectedPreferences: state.selectedPreferences || update.name,
        sharedPreferences: {
          ...state.sharedPreferences,
          [update.name]: entry,
        },
      };
    },

    ChangeSharedPreferences(state: SharedPreferencesState, event: Object) {
      const change = event.change;
      const entry = state.sharedPreferences[change.preferences];
      if (entry == null) {
        return state;
      }
      let newEntry;
      if (change.deleted) {
        const newPreferences = {
          ...entry.preferences,
        };
        delete newPreferences[change.name];
        newEntry = {
          ...entry,
          preferences: newPreferences,
        };
      } else {
        newEntry = {
          ...entry,
          preferences: {
            ...entry.preferences,
            [change.name]: change.value,
          },
        };
      }
      newEntry.changesList = [change, ...entry.changesList];
      return {
        ...state,
        sharedPreferences: {
          ...state.sharedPreferences,
          [change.preferences]: newEntry,
        },
      };
    },

    UpdateSelectedSharedPreferences(
      state: SharedPreferencesState,
      event: Object,
    ) {
      return {
        ...state,
        selectedPreferences: event.selected,
        sharedPreferences: state.sharedPreferences,
      };
    },
  };

  init() {
    this.client
      .call('getAllSharedPreferences')
      .then((results: {[name: string]: SharedPreferences}) => {
        Object.entries(results).forEach(([name, prefs]) => {
          const update = {name: name, preferences: prefs};
          this.dispatchAction({update, type: 'UpdateSharedPreferences'});
        });
      });

    this.client.subscribe(
      'sharedPreferencesChange',
      (change: SharedPreferencesChangeEvent) => {
        this.dispatchAction({change, type: 'ChangeSharedPreferences'});
      },
    );
  }

  onSharedPreferencesChanged = (path: Array<string>, value: any) => {
    const selectedPreferences = this.state.selectedPreferences;
    if (selectedPreferences == null) {
      return;
    }
    const entry = this.state.sharedPreferences[selectedPreferences];
    if (entry == null) {
      return;
    }

    const values = entry.preferences;
    let newValue = value;
    if (path.length === 2 && values) {
      newValue = clone(values[path[0]]);
      newValue[path[1]] = value;
    }
    this.client
      .call('setSharedPreference', {
        sharedPreferencesName: this.state.selectedPreferences,
        preferenceName: path[0],
        preferenceValue: newValue,
      })
      .then((results: SharedPreferences) => {
        const update = {
          name: this.state.selectedPreferences,
          preferences: results,
        };
        this.dispatchAction({update, type: 'UpdateSharedPreferences'});
      });
  };

  onSharedPreferencesSelected = (selected: string) => {
    this.dispatchAction({
      selected: selected,
      type: 'UpdateSelectedSharedPreferences',
    });
  };

  onSharedPreferencesDeleted = (path: Array<string>) => {
    this.client
      .call('deleteSharedPreference', {
        sharedPreferencesName: this.state.selectedPreferences,
        preferenceName: path[0],
      })
      .then((results: SharedPreferences) => {
        const update = {
          name: this.state.selectedPreferences,
          preferences: results,
        };
        this.dispatchAction({update, type: 'UpdateSharedPreferences'});
      });
  };

  render() {
    const selectedPreferences = this.state.selectedPreferences;
    if (selectedPreferences == null) {
      return null;
    }

    const entry = this.state.sharedPreferences[selectedPreferences];
    if (entry == null) {
      return null;
    }

    return (
      <RootColumn grow={true}>
        <Heading>
          <span style={{marginRight: '16px'}}>Preference File</span>
          <Select
            options={Object.keys(this.state.sharedPreferences)
              .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
              .reduce((obj, item) => {
                obj[item] = item;
                return obj;
              }, {})}
            selected={this.state.selectedPreferences}
            onChange={this.onSharedPreferencesSelected}
          />
        </Heading>
        <FlexRow grow={true} scrollable={true}>
          <InspectorColumn>
            <Heading>Inspector</Heading>
            <ManagedDataInspector
              data={entry.preferences}
              setValue={this.onSharedPreferencesChanged}
              onDelete={this.onSharedPreferencesDeleted}
            />
          </InspectorColumn>
          <ChangelogColumn>
            <Heading>Changelog</Heading>
            <ManagedTable
              columnSizes={CHANGELOG_COLUMN_SIZES}
              columns={CHANGELOG_COLUMNS}
              rowLineHeight={26}
              rows={entry.changesList.map((element, index) => {
                return {
                  columns: {
                    event: {
                      value: element.deleted ? DELETED_LABEL : UPDATED_LABEL,
                    },
                    name: {
                      value: element.name,
                    },
                    value: {
                      value: String(element.value),
                    },
                  },

                  key: String(index),
                };
              })}
            />
          </ChangelogColumn>
        </FlexRow>
      </RootColumn>
    );
  }
}

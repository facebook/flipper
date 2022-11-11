/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import {
  PluginClient,
  createState,
  usePlugin,
  useValue,
  getFlipperLib,
} from 'flipper-plugin';
import {clone} from 'lodash';

import React from 'react';
import {Button, notification} from 'antd';
type SharedPreferencesChangeEvent = {
  preferences: string;
  name: string;
  time: number;
  deleted: boolean;
  value?: any;
};
type SharedPreferences = Record<string, any>;
type SharedPreferencesEntry = {
  preferences: SharedPreferences;
  changesList: Array<SharedPreferencesChangeEvent>;
};

export type SetSharedPreferenceParams = {
  sharedPreferencesName: string;
  preferenceName: string;
  preferenceValue: any;
};
type DeleteSharedPreferenceParams = {
  sharedPreferencesName: string;
  preferenceName: string;
};

type Events = {sharedPreferencesChange: SharedPreferencesChangeEvent};
type Methods = {
  getAllSharedPreferences: (params: {}) => Promise<
    Record<string, SharedPreferences>
  >;
  setSharedPreference: (
    params: SetSharedPreferenceParams,
  ) => Promise<SharedPreferences>;
  deleteSharedPreference: (
    params: DeleteSharedPreferenceParams,
  ) => Promise<SharedPreferences>;
};

export function plugin(client: PluginClient<Events, Methods>) {
  const selectedPreferences = createState<string | null>(null, {
    persist: 'selectedPreferences',
  });
  const setSelectedPreferences = (value: string) =>
    selectedPreferences.set(value);
  const sharedPreferences = createState<Record<string, SharedPreferencesEntry>>(
    {},
    {persist: 'sharedPreferences'},
  );

  function updateSharedPreferences(update: {name: string; preferences: any}) {
    if (selectedPreferences.get() == null) {
      selectedPreferences.set(update.name);
    }
    sharedPreferences.update((draft) => {
      const entry = draft[update.name] || {changesList: []};
      entry.preferences = update.preferences;
      draft[update.name] = entry;
    });
  }

  async function setSharedPreference(params: SetSharedPreferenceParams) {
    const results = await client.send('setSharedPreference', params);
    updateSharedPreferences({
      name: params.sharedPreferencesName,
      preferences: results,
    });
  }
  async function deleteSharedPreference(params: DeleteSharedPreferenceParams) {
    const results = await client.send('deleteSharedPreference', params);
    updateSharedPreferences({
      name: params.sharedPreferencesName,
      preferences: results,
    });
  }

  async function saveToFile() {
    if (selectedPreferences.get() != null) {
      try {
        const name = selectedPreferences.get() as string;
        await getFlipperLib().exportFile(
          JSON.stringify(sharedPreferences.get()[name]),
          {
            defaultPath: name,
          },
        );
      } catch (e) {
        notification.error({
          message: 'Save failed',
          description: `Could not save shared preferences to file`,
          duration: 15,
        });
      }
    }
  }
  async function loadFromFile() {
    const file = await getFlipperLib().importFile();
    if (file?.path != undefined) {
      const data = await getFlipperLib().remoteServerContext.fs.readFile(
        file.path,
        {encoding: 'utf-8'},
      );
      const preferences = JSON.parse(data) as SharedPreferencesEntry;
      const name = selectedPreferences.get();
      if (name != null) {
        updateSharedPreferences({
          name: name,
          preferences: preferences.preferences,
        });

        for (const key in preferences.preferences) {
          await client.send('setSharedPreference', {
            sharedPreferencesName: name,
            preferenceName: key,
            preferenceValue: preferences.preferences[key],
          });
        }
      }
    }
  }

  client.onMessage('sharedPreferencesChange', (change) =>
    sharedPreferences.update((draft) => {
      const entry = draft[change.preferences];
      if (entry == null) {
        return;
      }
      if (change.deleted) {
        delete entry.preferences[change.name];
      } else {
        entry.preferences[change.name] = change.value;
      }
      entry.changesList.unshift(change);
      draft[change.preferences] = entry;
    }),
  );
  client.onConnect(async () => {
    const results = await client.send('getAllSharedPreferences', {});
    Object.entries(results).forEach(([name, prefs]) =>
      updateSharedPreferences({name: name, preferences: prefs}),
    );
  });

  return {
    selectedPreferences,
    sharedPreferences,
    setSelectedPreferences,
    setSharedPreference,
    deleteSharedPreference,
    saveToFile,
    loadFromFile,
  };
}

const CHANGELOG_COLUMNS = {
  event: {value: 'Event'},
  name: {value: 'Name'},
  value: {value: 'Value'},
};
const CHANGELOG_COLUMN_SIZES = {
  event: '30%',
  name: '30%',
  value: '30%',
};

const UPDATED_LABEL = <Text color={colors.lime}>Updated</Text>;
const DELETED_LABEL = <Text color={colors.cherry}>Deleted</Text>;

const InspectorColumn = styled(FlexColumn)({flexGrow: 0.2});
const ChangelogColumn = styled(FlexColumn)({
  flexGrow: 0.8,
  paddingLeft: '16px',
});
const RootColumn = styled(FlexColumn)({
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingTop: '16px',
});

export function Component() {
  const instance = usePlugin(plugin);
  const selectedPreferences = useValue(instance.selectedPreferences);
  const sharedPreferences = useValue(instance.sharedPreferences);

  if (selectedPreferences == null) {
    return null;
  }
  const entry = sharedPreferences[selectedPreferences];
  if (entry == null) {
    return null;
  }

  return (
    <RootColumn grow>
      <Heading>
        <span style={{marginRight: '16px'}}>Preference File</span>
        <Select
          options={Object.keys(sharedPreferences)
            .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
            .reduce((obj, item) => {
              obj[item] = item;
              return obj;
            }, {} as Record<string, string>)}
          selected={selectedPreferences}
          onChange={instance.setSelectedPreferences}
        />
        <span style={{marginLeft: '16px', marginRight: '16px'}}>Options</span>
        <Button size="small" onClick={() => instance.saveToFile()}>
          Save
        </Button>
        <Button
          style={{marginLeft: '8px'}}
          size="small"
          onClick={() => instance.loadFromFile()}>
          Load
        </Button>
      </Heading>
      <FlexRow grow scrollable style={{overflowX: 'hidden'}}>
        <InspectorColumn>
          <Heading>Inspector</Heading>
          <ManagedDataInspector
            data={entry.preferences}
            setValue={async (path: Array<string>, value: any) => {
              if (entry == null) {
                return;
              }
              const values = entry.preferences;
              let newValue = value;
              if (path.length === 2 && values) {
                newValue = clone(values[path[0]]);
                newValue[path[1]] = value;
              }
              await instance.setSharedPreference({
                sharedPreferencesName: selectedPreferences,
                preferenceName: path[0],
                preferenceValue: newValue,
              });
            }}
            onDelete={async (path: Array<string>) =>
              await instance.deleteSharedPreference({
                sharedPreferencesName: selectedPreferences,
                preferenceName: path[0],
              })
            }
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
                  name: {value: element.name},
                  value: {value: String(element.value)},
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

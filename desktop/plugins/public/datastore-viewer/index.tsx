/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Heading,
  FlexColumn,
  FlexRow,
  ManagedDataInspector,
  styled,
  Select,
} from 'flipper';
import {PluginClient, createState, usePlugin, useValue} from 'flipper-plugin';
import {clone} from 'lodash';
import React from 'react';

type DataStore = Record<string, any>;
type DataStoreChangeEvent = Record<string, DataStore>;

type SetDataStoreParams = {
  dataStoreName: string;
  preferenceName: string;
  preferenceValue: any;
};
type DeleteDataStoreParams = {
  dataStoreName: string;
  preferenceName: string;
};

type Events = {dataStoreChange: DataStoreChangeEvent};
type Methods = {
  setDataStoreItem: (params: SetDataStoreParams) => Promise<DataStore>;
  deleteDataStoreItem: (params: DeleteDataStoreParams) => Promise<DataStore>;
};

export function plugin(client: PluginClient<Events, Methods>) {
  const selectedDataStoreName = createState<string | null>(null, {
    persist: 'selectedDataStoreName',
  });
  const allDataStores = createState<Record<string, DataStore>>(
    {},
    {persist: 'allDataStores'},
  );

  function setSelectedDataStore(value: string) {
    selectedDataStoreName.set(value);
  }

  async function setDataStoreItem(params: SetDataStoreParams) {
    await client.send('setDataStoreItem', params);
  }

  async function deleteDataStoreItem(params: DeleteDataStoreParams) {
    await client.send('deleteDataStoreItem', params);
  }

  function _updateDataStore(update: {name: string; dataStore: DataStore}) {
    if (selectedDataStoreName.get() == null) {
      selectedDataStoreName.set(update.name);
    }
    allDataStores.update((draft) => {
      draft[update.name] = update.dataStore;
    });
  }

  client.onMessage('dataStoreChange', (change) => {
    Object.entries(change).forEach(([name, dataStore]) =>
      _updateDataStore({name, dataStore}),
    );
  });

  return {
    selectedDataStoreName,
    allDataStores,
    setSelectedDataStore,
    setDataStoreItem,
    deleteDataStoreItem,
  };
}

const InspectorColumn = styled(FlexColumn)({flexGrow: 0.2});
const RootColumn = styled(FlexColumn)({
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingTop: '16px',
});

export function Component() {
  const pluginInstance = usePlugin(plugin);
  const selectedDataStoreName = useValue(pluginInstance.selectedDataStoreName);
  const allDataStores = useValue(pluginInstance.allDataStores);

  if (selectedDataStoreName == null) {
    return null;
  }
  const dataStore = allDataStores[selectedDataStoreName];
  if (dataStore == null) {
    return null;
  }

  return (
    <RootColumn grow>
      <Heading>
        <span style={{marginRight: '12px'}}>DataStore File</span>
        <Select
          options={Object.keys(allDataStores).reduce((obj, item) => {
            obj[item] = item;
            return obj;
          }, {} as Record<string, string>)}
          selected={selectedDataStoreName}
          onChange={pluginInstance.setSelectedDataStore}
        />
      </Heading>
      <FlexRow grow scrollable>
        <InspectorColumn>
          <Heading>Inspector</Heading>
          <ManagedDataInspector
            data={dataStore}
            setValue={async (path: Array<string>, value: any) => {
              if (dataStore == null) {
                return;
              }
              let newValue = value;
              if (path.length === 2 && dataStore) {
                newValue = clone(dataStore[path[0]]);
                newValue[path[1]] = value;
              }
              await pluginInstance.setDataStoreItem({
                dataStoreName: selectedDataStoreName,
                preferenceName: path[0],
                preferenceValue: newValue,
              });
            }}
            onDelete={async (path: Array<string>) =>
              await pluginInstance.deleteDataStoreItem({
                dataStoreName: selectedDataStoreName,
                preferenceName: path[0],
              })
            }
          />
        </InspectorColumn>
      </FlexRow>
    </RootColumn>
  );
}

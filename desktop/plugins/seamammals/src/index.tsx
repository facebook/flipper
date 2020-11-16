/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo} from 'react';
import {Typography, Card} from 'antd';
import {
  Layout,
  PluginClient,
  usePlugin,
  createState,
  useValue,
  theme,
} from 'flipper-plugin';
import {ManagedDataInspector, DetailSidebar, styled} from 'flipper';

type Row = {
  id: number;
  title: string;
  url: string;
};

type Events = {
  newRow: Row;
};

export function plugin(client: PluginClient<Events, {}>) {
  const rows = createState<Record<string, Row>>({}, {persist: 'rows'});
  const selectedID = createState<string | null>(null, {persist: 'selection'});

  client.addMenuEntry(
    {
      label: 'Reset Selection',
      topLevelMenu: 'Edit',
      handler: () => {
        selectedID.set(null);
      },
    },
    {
      action: 'createPaste',
      handler: async () => {
        const selection = selectedID.get();
        if (selection) {
          const url = await client.createPaste(
            JSON.stringify(rows.get()[selection], null, 2),
          );
          alert(url); // TODO: use notifications T69990351
        }
      },
    },
  );

  client.onMessage('newRow', (row) => {
    rows.update((draft) => {
      draft[row.id] = row;
    });
  });

  function setSelection(id: number) {
    selectedID.set('' + id);
  }

  return {
    rows,
    selectedID,
    setSelection,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const rows = useValue(instance.rows);
  const selectedID = useValue(instance.selectedID);

  return (
    <>
      <Layout.ScrollContainer
        vertical
        style={{background: theme.backgroundWash}}>
        <Layout.Horizontal gap pad style={{flexWrap: 'wrap'}}>
          {Object.entries(rows).map(([id, row]) => (
            <MammalCard
              row={row}
              onSelect={instance.setSelection}
              selected={id === selectedID}
              key={id}
            />
          ))}
        </Layout.Horizontal>
      </Layout.ScrollContainer>
      <DetailSidebar>
        {selectedID && renderSidebar(rows[selectedID])}
      </DetailSidebar>
    </>
  );
}

function renderSidebar(row: Row) {
  return (
    <Layout.Container gap pad>
      <Typography.Title level={4}>Extras</Typography.Title>
      <ManagedDataInspector data={row} expandRoot={true} />
    </Layout.Container>
  );
}

type CardProps = {
  onSelect: (id: number) => void;
  selected: boolean;
  row: Row;
};
const MammalCard = memo(({row, selected, onSelect}: CardProps) => {
  return (
    <Card
      hoverable
      data-testid={row.title}
      onClick={() => onSelect(row.id)}
      title={row.title}
      style={{
        width: 150,
        borderColor: selected ? theme.primaryColor : undefined,
      }}>
      <Image style={{backgroundImage: `url(${row.url || ''})`}} />
    </Card>
  );
});

const Image = styled.div({
  backgroundSize: 'cover',
  width: '100%',
  paddingTop: '100%',
});

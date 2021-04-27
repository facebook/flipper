/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Button,
  colors,
  DetailSidebar,
  FlexCenter,
  FlexColumn,
  ManagedDataInspector,
  Panel,
  SearchableTable,
  styled,
  TableHighlightedRows,
} from 'flipper';
import {createState, PluginClient, usePlugin, useValue} from 'flipper-plugin';
import React from 'react';

export type MessageInfo = {
  device?: string;
  app: string;
  flipperInternalMethod?: string;
  plugin?: string;
  pluginMethod?: string;
  payload?: any;
  direction: 'toClient' | 'toFlipper';
};

export type MessageRow = {
  columns: {
    time: {
      value: string;
    };
    device: {
      value?: string;
      isFilterable: true;
    };
    app: {
      value: string;
      isFilterable: true;
    };
    internalMethod: {
      value?: string;
      isFilterable: true;
    };
    plugin: {
      value?: string;
      isFilterable: true;
    };
    pluginMethod: {
      value?: string;
      isFilterable: true;
    };
    direction: {
      value: string;
      isFilterable: true;
    };
  };
  timestamp: number;
  payload?: any;
  key: string;
};

type PersistedState = {
  messageRows: Array<MessageRow>;
};

const Placeholder = styled(FlexCenter)({
  fontSize: 18,
  color: colors.macOSTitleBarIcon,
});

const COLUMNS = {
  time: {
    value: 'Time',
  },
  device: {
    value: 'Device',
  },
  app: {
    value: 'App',
  },
  internalMethod: {
    value: 'Flipper internal method',
  },
  plugin: {
    value: 'Plugin',
  },
  pluginMethod: {
    value: 'Method',
  },
  direction: {
    value: 'Direction',
  },
};

const COLUMN_SIZES = {
  time: 'flex',
  device: 'flex',
  app: 'flex',
  internalMethod: 'flex',
  plugin: 'flex',
  pluginMethod: 'flex',
  direction: 'flex',
};

let rowId = 0;

function createRow(message: MessageInfo): MessageRow {
  return {
    columns: {
      time: {
        value: new Date().toLocaleTimeString(),
      },
      device: {
        value: message.device,
        isFilterable: true,
      },
      app: {
        value: message.app,
        isFilterable: true,
      },
      internalMethod: {
        value: message.flipperInternalMethod,
        isFilterable: true,
      },
      plugin: {
        value: message.plugin,
        isFilterable: true,
      },
      pluginMethod: {
        value: message.pluginMethod,
        isFilterable: true,
      },
      direction: {
        value: message.direction,
        isFilterable: true,
      },
    },
    timestamp: Date.now(),
    payload: message.payload,
    key: '' + rowId++,
  };
}

type Events = {
  newMessage: MessageInfo;
};

export function plugin(client: PluginClient<Events, {}>) {
  const state = createState<PersistedState>({
    messageRows: [],
  });
  const highlightedRow = createState<string | null>();
  const setHighlightedRow = (keys: TableHighlightedRows) => {
    if (keys.length > 0) {
      highlightedRow.set(keys[0]);
    }
  };
  const clear = () => {
    state.set({messageRows: []});
    highlightedRow.set(null);
  };

  client.onMessage('newMessage', (payload) => {
    state.update((draft) => {
      draft.messageRows = [...draft.messageRows, createRow(payload)].filter(
        (row) => Date.now() - row.timestamp < 5 * 60 * 1000,
      );
    });
  });

  return {
    state,
    highlightedRow,
    setHighlightedRow,
    clear,
  };
}

function Sidebar() {
  const instance = usePlugin(plugin);
  const rows = useValue(instance.state).messageRows;
  const highlightedRow = useValue(instance.highlightedRow);
  const message = rows.find((row) => row.key === highlightedRow);

  const renderExtra = (extra: any) => (
    <Panel floating={false} grow={false} heading={'Payload'}>
      <ManagedDataInspector data={extra} expandRoot={false} />
    </Panel>
  );

  return (
    <>
      {message != null ? (
        renderExtra(message.payload)
      ) : (
        <Placeholder grow>Select a message to view details</Placeholder>
      )}
    </>
  );
}

export function Component() {
  const instance = usePlugin(plugin);
  const rows = useValue(instance.state).messageRows;

  const clearTableButton = (
    <Button onClick={instance.clear} key="clear">
      Clear Table
    </Button>
  );

  return (
    <FlexColumn grow={true}>
      <SearchableTable
        rowLineHeight={28}
        floating={false}
        multiline={true}
        columnSizes={COLUMN_SIZES}
        columns={COLUMNS}
        onRowHighlighted={instance.setHighlightedRow}
        rows={rows}
        stickyBottom={true}
        actions={[clearTableButton]}
      />
      <DetailSidebar>
        <Sidebar />
      </DetailSidebar>
    </FlexColumn>
  );
}

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
  FlipperPlugin,
  ManagedDataInspector,
  Panel,
  SearchableTable,
  styled,
  TableHighlightedRows,
} from 'flipper';
import React from 'react';

type MessageInfo = {
  device?: string;
  app: string;
  flipperInternalMethod?: string;
  plugin?: string;
  pluginMethod?: string;
  payload?: any;
  direction: 'toClient' | 'toFlipper';
};

type MessageRow = {
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

type State = {
  selectedId: string | null;
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

export default class extends FlipperPlugin<State, any, PersistedState> {
  static defaultPersistedState = {
    messageRows: [],
  };

  state: State = {
    selectedId: null,
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: any,
  ): PersistedState => {
    if (method === 'newMessage') {
      return {
        ...persistedState,
        messageRows: [...persistedState.messageRows, createRow(payload)].filter(
          (row) => Date.now() - row.timestamp < 5 * 60 * 1000,
        ),
      };
    }
    return persistedState;
  };

  render() {
    const clearTableButton = (
      <Button onClick={this.clear} key="clear">
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
          onRowHighlighted={this.onRowHighlighted}
          rows={this.props.persistedState.messageRows}
          stickyBottom={true}
          actions={[clearTableButton]}
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </FlexColumn>
    );
  }

  onRowHighlighted = (keys: TableHighlightedRows) => {
    if (keys.length > 0) {
      this.setState({
        selectedId: keys[0],
      });
    }
  };

  renderSidebar() {
    const {selectedId} = this.state;
    const {messageRows} = this.props.persistedState;
    if (selectedId !== null) {
      const message = messageRows.find((row) => row.key == selectedId);
      if (message != null) {
        return this.renderExtra(message.payload);
      }
    }
    return <Placeholder grow>Select a message to view details</Placeholder>;
  }

  renderExtra(extra: any) {
    return (
      <Panel floating={false} grow={false} heading={'Payload'}>
        <ManagedDataInspector data={extra} expandRoot={false} />
      </Panel>
    );
  }

  clear = () => {
    this.setState({selectedId: null});
    this.props.setPersistedState({messageRows: []});
  };
}

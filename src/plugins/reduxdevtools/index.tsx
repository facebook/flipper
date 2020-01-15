/* eslint-disable header/header */
import {
  FlipperPlugin,
  Button,
  DetailSidebar,
  FlexColumn,
  SearchableTable,
  Text,
  Panel,
  DataDescription,
  ManagedDataInspector,
  PluginProps,
} from 'flipper';

type PersistedState = {
  actions: Array<any>;
};

type State = {
  selectedIds: Array<string>;
};

function tryConvertToJson(value: any): string {
  if (
    typeof value === 'string' &&
    (value.startsWith('{') || value.startsWith('['))
  ) {
    try {
      return JSON.parse(value);
    } catch (e) {}
  }
  return value;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}.${date
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;
}

const COLUMN_SIZE = {
  timeStamp: 100,
  actionType: 'flex',
};

const COLUMNS = {
  timeStamp: {
    value: 'Time',
  },
  actionType: {
    value: 'Action Type',
  },
};

class FlipperReduxInspectorPlugin extends FlipperPlugin<
  State,
  any,
  PersistedState
> {
  static id = 'ReduxInspector';

  static defaultPersistedState = {
    actions: [],
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    data: any
  ): PersistedState => {
    return {
      ...persistedState,
      actions: [...persistedState.actions, data],
    };
  };

  constructor(props: PluginProps<State, any, PersistedState>) {
    super(props);

    this.state = {
      selectedIds: [],
    };
  }

  clear = () => {
    this.setState({ selectedIds: [] });
    this.props.setPersistedState({ actions: [] });
  };

  onRowHighlighted = keys => {
    this.setState({ selectedIds: keys });
  };

  renderSidebar = () => {
    const { selectedIds } = this.state;
    const selectedId = selectedIds.length !== 1 ? null : selectedIds[0];

    if (selectedId != null) {
      const { actions } = this.props.persistedState;
      const selectedData = actions.find(v => v.uniqueId === selectedId);

      const { payload, prevState, nextState } = selectedData;

      const parsedPayload = tryConvertToJson(payload);
      const parsedPrevState = tryConvertToJson(prevState);
      const parsedNextState = tryConvertToJson(nextState);

      return (
        <div>
          <Panel floating={false} heading={'Payload'}>
            {typeof parsedPayload !== 'object' ? (
              <DataDescription
                type={typeof parsedPayload}
                value={parsedPayload}
              />
            ) : (
              <ManagedDataInspector data={parsedPayload} expandRoot={true} />
            )}
          </Panel>
          <Panel floating={false} heading={'State'}>
            {typeof parsedNextState !== 'object' ? (
              <DataDescription
                type={typeof parsedNextState}
                value={parsedNextState}
              />
            ) : (
              <ManagedDataInspector
                diff={parsedPrevState}
                data={parsedNextState}
                expandRoot={true}
              />
            )}
          </Panel>
        </div>
      );
    } else {
      return null;
    }
  };

  buildRow = row => {
    return {
      columns: {
        timeStamp: {
          value: <Text>{formatTimestamp(row.timeStamp)}</Text>,
          filterValue: row.timeStamp,
        },
        actionType: {
          value: <Text>{row.actionType}</Text>,
          filterValue: row.actionType,
        },
      },
      key: row.uniqueId,
      copyText: JSON.stringify(row),
      filterValue: `${row.actionType}`,
    };
  };

  render() {
    const { actions } = this.props.persistedState;
    const rows = actions.map(v => this.buildRow(v));

    return (
      <FlexColumn grow={true}>
        <SearchableTable
          key={this.constructor.id}
          rowLineHeight={28}
          floating={false}
          multiline={true}
          columnSizes={COLUMN_SIZE}
          columns={COLUMNS}
          onRowHighlighted={this.onRowHighlighted}
          multiHighlight={true}
          rows={rows}
          stickyBottom={true}
          actions={<Button onClick={this.clear}>Clear</Button>}
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </FlexColumn>
    );
  }
}

export default FlipperReduxInspectorPlugin;

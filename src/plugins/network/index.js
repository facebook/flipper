/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {TableHighlightedRows, TableRows} from 'sonar';

import {
  ContextMenu,
  FlexColumn,
  Button,
  Text,
  Glyph,
  colors,
  PureComponent,
  SonarSidebar,
} from 'sonar';

import {SonarPlugin, SearchableTable} from 'sonar';
import RequestDetails from './RequestDetails.js';

import {URL} from 'url';
// $FlowFixMe
import sortBy from 'lodash.sortby';

type RequestId = string;

type State = {|
  requests: {[id: RequestId]: Request},
  responses: {[id: RequestId]: Response},
  selectedIds: Array<RequestId>,
|};

export type Request = {|
  id: RequestId,
  timestamp: number,
  method: string,
  url: string,
  headers: Array<Header>,
  data: ?string,
|};

export type Response = {|
  id: RequestId,
  timestamp: number,
  status: number,
  reason: string,
  headers: Array<Header>,
  data: ?string,
|};

export type Header = {|
  key: string,
  value: string,
|};

const COLUMN_SIZE = {
  domain: 'flex',
  method: 100,
  status: 70,
  size: 100,
  duration: 100,
};

const COLUMNS = {
  domain: {
    value: 'Domain',
  },
  method: {
    value: 'Method',
  },
  status: {
    value: 'Status',
  },
  size: {
    value: 'Size',
  },
  duration: {
    value: 'Duration',
  },
};

export function getHeaderValue(headers: Array<Header>, key: string) {
  for (const header of headers) {
    if (header.key.toLowerCase() === key.toLowerCase()) {
      return header.value;
    }
  }
  return '';
}

export function formatBytes(count: number): string {
  if (count > 1024 * 1024) {
    return (count / (1024.0 * 1024)).toFixed(1) + ' MB';
  }
  if (count > 1024) {
    return (count / 1024.0).toFixed(1) + ' kB';
  }
  return count + ' B';
}

const TextEllipsis = Text.extends({
  overflowX: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  lineHeight: '18px',
  paddingTop: 4,
});

export default class extends SonarPlugin<State> {
  static title = 'Network';
  static id = 'Network';
  static icon = 'internet';
  static keyboardActions = ['clear'];

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.clearLogs();
    }
  };

  state = {
    requests: {},
    responses: {},
    selectedIds: [],
  };

  init() {
    this.client.subscribe('newRequest', (request: Request) => {
      this.dispatchAction({request, type: 'NewRequest'});
    });
    this.client.subscribe('newResponse', (response: Response) => {
      this.dispatchAction({response, type: 'NewResponse'});
    });
  }

  reducers = {
    NewRequest(state: State, {request}: {request: Request}) {
      return {
        requests: {...state.requests, [request.id]: request},
        responses: state.responses,
      };
    },

    NewResponse(state: State, {response}: {response: Response}) {
      return {
        requests: state.requests,
        responses: {...state.responses, [response.id]: response},
      };
    },

    Clear(state: State) {
      return {
        requests: {},
        responses: {},
      };
    },
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedIds});

  clearLogs = () => {
    this.setState({selectedIds: []});
    this.dispatchAction({type: 'Clear'});
  };

  renderSidebar = () => {
    const {selectedIds, requests, responses} = this.state;
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;

    return selectedId != null ? (
      <RequestDetails
        key={selectedId}
        request={requests[selectedId]}
        response={responses[selectedId]}
      />
    ) : null;
  };

  render() {
    return (
      <FlexColumn fill={true}>
        <NetworkTable
          requests={this.state.requests}
          responses={this.state.responses}
          clear={this.clearLogs}
          onRowHighlighted={this.onRowHighlighted}
        />
        <SonarSidebar>{this.renderSidebar()}</SonarSidebar>
      </FlexColumn>
    );
  }
}

type NetworkTableProps = {|
  requests: {[id: RequestId]: Request},
  responses: {[id: RequestId]: Response},
  clear: () => void,
  onRowHighlighted: (keys: TableHighlightedRows) => void,
|};

type NetworkTableState = {|
  sortedRows: TableRows,
|};

class NetworkTable extends PureComponent<NetworkTableProps, NetworkTableState> {
  static ContextMenu = ContextMenu.extends({
    flex: 1,
  });

  state = {
    sortedRows: [],
  };

  componentWillReceiveProps(nextProps: NetworkTableProps) {
    if (Object.keys(nextProps.requests).length === 0) {
      // cleared
      this.setState({sortedRows: []});
    } else if (this.props.requests !== nextProps.requests) {
      // new request
      for (const requestId in nextProps.requests) {
        if (this.props.requests[requestId] == null) {
          this.buildRow(nextProps.requests[requestId], null);
          break;
        }
      }
    } else if (this.props.responses !== nextProps.responses) {
      // new response
      for (const responseId in nextProps.responses) {
        if (this.props.responses[responseId] == null) {
          this.buildRow(
            nextProps.requests[responseId],
            nextProps.responses[responseId],
          );
          break;
        }
      }
    }
  }

  buildRow(request: Request, response: ?Response) {
    if (request == null) {
      return;
    }
    const url = new URL(request.url);
    const domain = url.host + url.pathname;
    const friendlyName = getHeaderValue(request.headers, 'X-FB-Friendly-Name');

    const newRow = {
      columns: {
        domain: {
          value: (
            <TextEllipsis>{friendlyName ? friendlyName : domain}</TextEllipsis>
          ),
          isFilterable: true,
        },
        method: {
          value: <TextEllipsis>{request.method}</TextEllipsis>,
          isFilterable: true,
        },
        status: {
          value: (
            <StatusColumn>
              {response ? response.status : undefined}
            </StatusColumn>
          ),
          isFilterable: true,
        },
        size: {
          value: <SizeColumn response={response ? response : undefined} />,
        },
        duration: {
          value: <DurationColumn request={request} response={response} />,
        },
      },
      key: request.id,
      filterValue: `${request.method} ${request.url}`,
      sortKey: request.timestamp,
      copyText: request.url,
      highlightOnHover: true,
    };

    let rows;
    if (response == null) {
      rows = [...this.state.sortedRows, newRow];
    } else {
      const index = this.state.sortedRows.findIndex(r => r.key === request.id);
      if (index > -1) {
        rows = [...this.state.sortedRows];
        rows[index] = newRow;
      }
    }

    this.setState({
      sortedRows: sortBy(rows, x => x.sortKey),
    });
  }

  contextMenuItems = [
    {
      type: 'separator',
    },
    {
      label: 'Clear all',
      click: this.props.clear,
    },
  ];

  render() {
    return (
      <NetworkTable.ContextMenu items={this.contextMenuItems}>
        <SearchableTable
          virtual={true}
          multiline={false}
          multiHighlight={true}
          stickyBottom={true}
          floating={false}
          columnSizes={COLUMN_SIZE}
          columns={COLUMNS}
          rows={this.state.sortedRows}
          onRowHighlighted={this.props.onRowHighlighted}
          rowLineHeight={26}
          zebra={false}
          actions={<Button onClick={this.props.clear}>Clear Table</Button>}
        />
      </NetworkTable.ContextMenu>
    );
  }
}

const Icon = Glyph.extends({
  marginTop: -3,
  marginRight: 3,
});

class StatusColumn extends PureComponent<{
  children?: number,
}> {
  render() {
    const {children} = this.props;
    let glyph;

    if (children != null && children >= 400 && children < 600) {
      glyph = <Icon name="stop-solid" color={colors.red} />;
    }

    return (
      <TextEllipsis>
        {glyph}
        {children}
      </TextEllipsis>
    );
  }
}

class DurationColumn extends PureComponent<{
  request: Request,
  response: ?Response,
}> {
  static Text = Text.extends({
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  });

  render() {
    const {request, response} = this.props;
    const duration = response
      ? response.timestamp - request.timestamp
      : undefined;
    return (
      <DurationColumn.Text selectable={false}>
        {duration != null ? duration.toLocaleString() + 'ms' : ''}
      </DurationColumn.Text>
    );
  }
}

class SizeColumn extends PureComponent<{
  response: ?Response,
}> {
  static Text = Text.extends({
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  });

  render() {
    const {response} = this.props;
    if (response) {
      const text = formatBytes(this.getResponseLength(response));
      return <SizeColumn.Text>{text}</SizeColumn.Text>;
    } else {
      return null;
    }
  }

  getResponseLength(response) {
    let length = 0;
    const lengthString = response.headers
      ? getHeaderValue(response.headers, 'content-length')
      : undefined;
    if (lengthString != null && lengthString != '') {
      length = parseInt(lengthString, 10);
    } else if (response.data) {
      length = atob(response.data).length;
    }
    return length;
  }
}

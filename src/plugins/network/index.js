/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {TableHighlightedRows, TableRows, TableBodyRow} from 'flipper';

import {
  ContextMenu,
  FlexColumn,
  Button,
  Text,
  Glyph,
  colors,
  PureComponent,
  DetailSidebar,
  styled,
  SearchableTable,
  FlipperPlugin,
} from 'flipper';
import RequestDetails from './RequestDetails.js';
import {URL} from 'url';
import type {Notification} from '../../plugin';

type RequestId = string;

type PersistedState = {|
  requests: {[id: RequestId]: Request},
  responses: {[id: RequestId]: Response},
|};

type State = {|
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

export function getHeaderValue(headers: Array<Header>, key: string): string {
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

const TextEllipsis = styled(Text)({
  overflowX: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  lineHeight: '18px',
  paddingTop: 4,
});

export default class extends FlipperPlugin<State, *, PersistedState> {
  static title = 'Network';
  static id = 'Network';
  static icon = 'internet';
  static keyboardActions = ['clear'];
  static subscribed = [];
  static defaultPersistedState = {
    requests: {},
    responses: {},
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    data: Request | Response,
  ): PersistedState => {
    const dataType: 'requests' | 'responses' = data.url
      ? 'requests'
      : 'responses';
    return {
      ...persistedState,
      [dataType]: {
        ...persistedState[dataType],
        [data.id]: data,
      },
    };
  };

  static getActiveNotifications = (
    persistedState: PersistedState,
  ): Array<Notification> => {
    const responses = persistedState ? persistedState.responses || [] : [];
    return (
      // $FlowFixMe Object.values returns Array<mixed>, but we know it is Array<Response>
      (Object.values(responses): Array<Response>)
        // Show error messages for all status codes indicating a client or server error
        .filter((response: Response) => response.status >= 400)
        .map((response: Response) => ({
          id: response.id,
          title: `HTTP ${response.status}: Network request failed`,
          message: `Request to "${persistedState.requests[response.id]?.url ||
            '(URL missing)'}" failed. ${response.reason}`,
          severity: 'error',
          timestamp: response.timestamp,
          category: response.status,
          action: response.id,
        }))
    );
  };

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.clearLogs();
    }
  };

  state = {
    selectedIds: this.props.deepLinkPayload ? [this.props.deepLinkPayload] : [],
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedIds});

  clearLogs = () => {
    this.setState({selectedIds: []});
    this.props.setPersistedState({responses: {}, requests: {}});
  };

  renderSidebar = () => {
    const {requests, responses} = this.props.persistedState;
    const {selectedIds} = this.state;
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
    const {requests, responses} = this.props.persistedState;

    return (
      <FlexColumn grow={true}>
        <NetworkTable
          requests={requests || {}}
          responses={responses || {}}
          clear={this.clearLogs}
          onRowHighlighted={this.onRowHighlighted}
          highlightedRows={
            this.state.selectedIds ? new Set(this.state.selectedIds) : null
          }
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </FlexColumn>
    );
  }
}

type NetworkTableProps = {
  requests: {[id: RequestId]: Request},
  responses: {[id: RequestId]: Response},
  clear: () => void,
  onRowHighlighted: (keys: TableHighlightedRows) => void,
  highlightedRows: ?Set<string>,
};

type NetworkTableState = {|
  sortedRows: TableRows,
|};

function buildRow(request: Request, response: ?Response): ?TableBodyRow {
  if (request == null) {
    return;
  }
  const url = new URL(request.url);
  const domain = url.host + url.pathname;
  const friendlyName = getHeaderValue(request.headers, 'X-FB-Friendly-Name');

  return {
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
          <StatusColumn>{response ? response.status : undefined}</StatusColumn>
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
}

function calculateState(
  props: {
    requests: {[id: RequestId]: Request},
    responses: {[id: RequestId]: Response},
  },
  nextProps: NetworkTableProps,
  rows: TableRows = [],
): NetworkTableState {
  rows = [...rows];

  if (Object.keys(nextProps.requests).length === 0) {
    // cleared
    rows = [];
  } else if (props.requests !== nextProps.requests) {
    // new request
    for (const requestId in nextProps.requests) {
      if (props.requests[requestId] == null) {
        const newRow = buildRow(
          nextProps.requests[requestId],
          nextProps.responses[requestId],
        );
        if (newRow) {
          rows.push(newRow);
        }
      }
    }
  } else if (props.responses !== nextProps.responses) {
    // new response
    for (const responseId in nextProps.responses) {
      if (props.responses[responseId] == null) {
        const newRow = buildRow(
          nextProps.requests[responseId],
          nextProps.responses[responseId],
        );
        const index = rows.findIndex(
          r => r.key === nextProps.requests[responseId]?.id,
        );
        if (index > -1 && newRow) {
          rows[index] = newRow;
        }
        break;
      }
    }
  }

  rows.sort((a, b) => (String(a.sortKey) > String(b.sortKey) ? 1 : -1));

  return {
    sortedRows: rows,
  };
}

class NetworkTable extends PureComponent<NetworkTableProps, NetworkTableState> {
  static ContextMenu = styled(ContextMenu)({
    flex: 1,
  });

  constructor(props: NetworkTableProps) {
    super(props);
    this.state = calculateState(
      {
        requests: {},
        responses: {},
      },
      props,
    );
  }

  componentWillReceiveProps(nextProps: NetworkTableProps) {
    this.setState(calculateState(this.props, nextProps, this.state.sortedRows));
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
          highlightedRows={this.props.highlightedRows}
          rowLineHeight={26}
          zebra={false}
          actions={<Button onClick={this.props.clear}>Clear Table</Button>}
        />
      </NetworkTable.ContextMenu>
    );
  }
}

const Icon = styled(Glyph)({
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
  static Text = styled(Text)({
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
  static Text = styled(Text)({
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

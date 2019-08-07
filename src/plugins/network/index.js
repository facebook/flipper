/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableHighlightedRows,
  TableRows,
  TableBodyRow,
  MetricType,
} from 'flipper';
import {padStart} from 'lodash';

import {
  ContextMenu,
  FlexColumn,
  FlexRow,
  Button,
  Text,
  Glyph,
  colors,
  PureComponent,
  DetailSidebar,
  styled,
  SearchableTable,
  FlipperPlugin,
  Sheet,
} from 'flipper';

import {MockResponseDialog} from './MockResponseDialog';

import type {Request, RequestId, Response, Route} from './types.js';
import {
  convertRequestToCurlCommand,
  getHeaderValue,
  decodeBody,
} from './utils.js';
import RequestDetails from './RequestDetails.js';
import {clipboard} from 'electron';
import {URL} from 'url';
import type {Notification} from '../../plugin';

type PersistedState = {|
  requests: {[id: RequestId]: Request},
  responses: {[id: RequestId]: Response},
  routes: Map<RequestId, Route>,
  showMockResponseDialog: boolean,
  isMockResponseSupported: boolean,
|};

type State = {|
  selectedIds: Array<RequestId>,
  isMockResponseSupported: boolean,
|};

const COLUMN_SIZE = {
  requestTimestamp: 100,
  responseTimestamp: 100,
  domain: 'flex',
  method: 100,
  status: 70,
  size: 100,
  duration: 100,
};

const COLUMN_ORDER = [
  {key: 'requestTimestamp', visible: true},
  {key: 'responseTimestamp', visible: false},
  {key: 'domain', visible: true},
  {key: 'method', visible: true},
  {key: 'status', visible: true},
  {key: 'size', visible: true},
  {key: 'duration', visible: true},
];

const COLUMNS = {
  requestTimestamp: {
    value: 'Request Time',
  },
  responseTimestamp: {
    value: 'Response Time',
  },
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
  static keyboardActions = ['clear'];
  static subscribed = [];
  static defaultPersistedState = {
    requests: {},
    responses: {},
    routes: new Map(),
    showMockResponseDialog: false,
    isMockResponseSupported: false,
  };

  static metricsReducer = (
    persistedState: PersistedState,
  ): Promise<MetricType> => {
    const failures = Object.keys(persistedState.responses).reduce(function(
      previous,
      key,
    ) {
      return previous + (persistedState.responses[key].status >= 400);
    },
    0);
    return Promise.resolve({NUMBER_NETWORK_FAILURES: failures});
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
    // $FlowFixMe Object.values returns Array<mixed>, but we know it is Array<Response>
    const r: Array<Response> = Object.values(responses);

    return (
      r
        // Show error messages for all status codes indicating a client or server error
        .filter((response: Response) => response.status >= 400)
        .map((response: Response) => ({
          id: response.id,
          title: `HTTP ${response.status}: Network request failed`,
          message: `Request to "${persistedState.requests[response.id]?.url ||
            '(URL missing)'}" failed. ${response.reason}`,
          severity: 'error',
          timestamp: response.timestamp,
          category: `HTTP${response.status}`,
          action: response.id,
        }))
    );
  };

  init() {
    if (this.props.persistedState.routes) {
      this.informClientMockChange(this.props.persistedState.routes);
    }
    this.client.supportsMethod('mockResponses').then(result =>
      this.setState({
        ...this.state,
        isMockResponseSupported: result,
      }),
    );
  }

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.clearLogs();
    }
  };

  state = {
    ...this.state,
    selectedIds: this.props.deepLinkPayload ? [this.props.deepLinkPayload] : [],
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedIds});

  copyRequestCurlCommand = () => {
    const {requests} = this.props.persistedState;
    const {selectedIds} = this.state;
    // Ensure there is only one row highlighted.
    if (selectedIds.length !== 1) {
      return;
    }

    const request = requests[selectedIds[0]];
    const command = convertRequestToCurlCommand(request);
    clipboard.writeText(command);
  };

  clearLogs = () => {
    this.setState({selectedIds: []});
    this.props.setPersistedState({responses: {}, requests: {}});
  };

  informClientMockChange = (routes: Map<RequestId, Route>) => {
    this.client.supportsMethod('mockResponses').then(supported => {
      if (supported) {
        const routesValuesArray = [...routes.values()];
        this.client.call('mockResponses', {
          routes: routesValuesArray.map((route: Route) => ({
            ...route,
            headers: [...route.headers.values()],
          })),
        });
      }
    });
  };

  handleRoutesChange = (routes: Map<RequestId, Route>) => {
    // save to persisted state
    this.props.setPersistedState({
      ...this.props.persistedState,
      routes: routes,
    });
    // inform client
    const filteredMap = new Map(
      [...routes].filter(([k, route]) => !route.isDuplicate),
    );
    this.informClientMockChange(filteredMap);
  };

  onMockButtonPressed = () => {
    this.props.setPersistedState({
      ...this.props.persistedState,
      showMockResponseDialog: true,
    });
  };

  onCloseButtonPressed = () => {
    this.props.setPersistedState({
      ...this.props.persistedState,
      showMockResponseDialog: false,
    });
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
    const {
      requests,
      responses,
      routes,
      showMockResponseDialog,
    } = this.props.persistedState;
    return (
      <FlexColumn grow={true}>
        <NetworkTable
          requests={requests || {}}
          responses={responses || {}}
          routes={routes || new Map()}
          onMockButtonPressed={this.onMockButtonPressed}
          onCloseButtonPressed={this.onCloseButtonPressed}
          showMockResponseDialog={showMockResponseDialog}
          clear={this.clearLogs}
          copyRequestCurlCommand={this.copyRequestCurlCommand}
          onRowHighlighted={this.onRowHighlighted}
          highlightedRows={
            this.state.selectedIds ? new Set(this.state.selectedIds) : null
          }
          handleRoutesChange={this.handleRoutesChange}
          isMockResponseSupported={this.state.isMockResponseSupported}
        />
        <DetailSidebar width={500}>{this.renderSidebar()}</DetailSidebar>
      </FlexColumn>
    );
  }
}

type NetworkTableProps = {
  requests: {[id: RequestId]: Request},
  responses: {[id: RequestId]: Response},
  clear: () => void,
  copyRequestCurlCommand: () => void,
  onRowHighlighted: (keys: TableHighlightedRows) => void,
  highlightedRows: ?Set<string>,
  routes: Map<RequestId, Route>,
  handleRoutesChange: (routes: Map<RequestId, Route>) => void,
  onMockButtonPressed: () => void,
  onCloseButtonPressed: () => void,
  showMockResponseDialog: boolean,
  isMockResponseSupported: boolean,
};

type NetworkTableState = {|
  sortedRows: TableRows,
  routes: Map<RequestId, Route>,
|};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${padStart(date.getHours().toString(), 2, '0')}:${padStart(
    date.getMinutes().toString(),
    2,
    '0',
  )}:${padStart(date.getSeconds().toString(), 2, '0')}.${padStart(
    date.getMilliseconds().toString(),
    3,
    '0',
  )}`;
}

function buildRow(request: Request, response: ?Response): ?TableBodyRow {
  if (request == null) {
    return;
  }
  const url = new URL(request.url);
  const domain = url.host + url.pathname;
  const friendlyName = getHeaderValue(request.headers, 'X-FB-Friendly-Name');
  const style =
    response && response.isMock
      ? {
          backgroundColor: colors.yellowTint,
          color: colors.yellow,
          fontWeight: 500,
        }
      : {};

  let copyText = `# HTTP request for ${domain} (ID: ${request.id})
## Request
HTTP ${request.method} ${request.url}
${request.headers
  .map(({key, value}) => `${key}: ${String(value)}`)
  .join('\n')}`;

  if (request.data) {
    copyText += `\n\n${decodeBody(request)}`;
  }

  if (response) {
    copyText += `

## Response
HTTP ${response.status} ${response.reason}
${response.headers
  .map(({key, value}) => `${key}: ${String(value)}`)
  .join('\n')}`;
  }

  if (response) {
    copyText += `\n\n${decodeBody(response)}`;
  }

  return {
    columns: {
      requestTimestamp: {
        value: (
          <TextEllipsis>{formatTimestamp(request.timestamp)}</TextEllipsis>
        ),
      },
      responseTimestamp: {
        value: (
          <TextEllipsis>
            {response && formatTimestamp(response.timestamp)}
          </TextEllipsis>
        ),
      },
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
    copyText,
    highlightOnHover: true,
    style: style,
  };
}

function calculateState(
  props: {
    requests: {[id: RequestId]: Request},
    responses: {[id: RequestId]: Response},
  },
  nextProps: NetworkTableProps,
  rows: TableRows = [],
  routes: Map<RequestId, Route> = new Map(),
): NetworkTableState {
  routes = new Map([...nextProps.routes]);
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
    routes: routes,
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
        routes: [],
      },
      props,
    );
  }

  componentWillReceiveProps(nextProps: NetworkTableProps) {
    this.setState(calculateState(this.props, nextProps, this.state.sortedRows));
  }

  contextMenuItems() {
    const {clear, copyRequestCurlCommand, highlightedRows} = this.props;
    const highlightedMenuItems =
      highlightedRows && highlightedRows.size === 1
        ? [
            {
              type: 'separator',
            },
            {
              label: 'Copy as cURL',
              click: copyRequestCurlCommand,
            },
          ]
        : [];

    return highlightedMenuItems.concat([
      {
        type: 'separator',
      },
      {
        label: 'Clear all',
        click: clear,
      },
    ]);
  }

  render() {
    return (
      <NetworkTable.ContextMenu items={this.contextMenuItems()}>
        {this.props.showMockResponseDialog ? (
          <Sheet>
            {onHide => (
              <MockResponseDialog
                routes={this.state.routes}
                onHide={onHide}
                onDismiss={this.props.onCloseButtonPressed}
                handleRoutesChange={this.props.handleRoutesChange}
              />
            )}
          </Sheet>
        ) : null}
        <SearchableTable
          virtual={true}
          multiline={false}
          multiHighlight={true}
          stickyBottom={true}
          floating={false}
          columnSizes={COLUMN_SIZE}
          columns={COLUMNS}
          columnOrder={COLUMN_ORDER}
          rows={this.state.sortedRows}
          onRowHighlighted={this.props.onRowHighlighted}
          highlightedRows={this.props.highlightedRows}
          rowLineHeight={26}
          allowRegexSearch={true}
          zebra={false}
          actions={
            <FlexRow>
              <Button onClick={this.props.clear}>Clear Table</Button>
              {this.props.isMockResponseSupported && (
                <Button onClick={this.props.onMockButtonPressed}>Mock</Button>
              )}
            </FlexRow>
          }
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
      glyph = <Icon name="stop" color={colors.red} />;
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
      length = Buffer.byteLength(response.data, 'base64');
    }
    return length;
  }
}

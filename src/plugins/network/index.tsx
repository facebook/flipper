/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TableHighlightedRows, TableRows, TableBodyRow} from 'flipper';
import {padStart} from 'lodash';
import React from 'react';
import {MenuItemConstructorOptions} from 'electron';

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
import {Request, RequestId, Response, Route} from './types';
import {convertRequestToCurlCommand, getHeaderValue, decodeBody} from './utils';
import RequestDetails from './RequestDetails';
import {clipboard} from 'electron';
import {URL} from 'url';
import {DefaultKeyboardAction} from 'src/MenuBar';
import {MockResponseDialog} from './MockResponseDialog';

type PersistedState = {
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
  routes: Map<RequestId, Route>;
  showMockResponseDialog: boolean;
  isMockResponseSupported: boolean;
};

type State = {
  selectedIds: Array<RequestId>;
  isMockResponseSupported: boolean;
};

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
  requestTimestamp: {value: 'Request Time'},
  responseTimestamp: {value: 'Response Time'},
  domain: {value: 'Domain'},
  method: {value: 'Method'},
  status: {value: 'Status'},
  size: {value: 'Size'},
  duration: {value: 'Duration'},
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

export default class extends FlipperPlugin<State, any, PersistedState> {
  static keyboardActions: Array<DefaultKeyboardAction> = ['clear'];
  static subscribed = [];
  static defaultPersistedState = {
    requests: {},
    responses: {},
    routes: new Map(),
    showMockResponseDialog: false,
    isMockResponseSupported: false,
  };

  static metricsReducer(persistedState: PersistedState) {
    const failures = Object.values(persistedState.responses).reduce(function(
      previous,
      values,
    ) {
      return previous + (values.status >= 400 ? 1 : 0);
    },
    0);
    return Promise.resolve({NUMBER_NETWORK_FAILURES: failures});
  }

  static persistedStateReducer(
    persistedState: PersistedState,
    method: string,
    data: Request | Response,
  ) {
    switch (method) {
      case 'newRequest':
        return Object.assign({}, persistedState, {
          requests: {...persistedState.requests, [data.id]: data as Request},
        });
      case 'newResponse':
        return Object.assign({}, persistedState, {
          responses: {...persistedState.responses, [data.id]: data as Response},
        });
      default:
        return persistedState;
    }
  }

  static serializePersistedState = (persistedState: PersistedState) => {
    return Promise.resolve(JSON.stringify(persistedState));
  };

  static deserializePersistedState = (serializedString: string) => {
    return JSON.parse(serializedString);
  };

  static getActiveNotifications(persistedState: PersistedState) {
    const responses = persistedState
      ? persistedState.responses || new Map()
      : new Map();
    const r: Array<Response> = Object.values(responses);
    return (
      r
        // Show error messages for all status codes indicating a client or server error
        .filter((response: Response) => response.status >= 400)
        .map((response: Response) => {
          const request = persistedState.requests[response.id];
          const url: string = (request && request.url) || '(URL missing)';
          return {
            id: response.id,
            title: `HTTP ${response.status}: Network request failed`,
            message: `Request to ${url} failed. ${response.reason}`,
            severity: 'error' as 'error',
            timestamp: response.timestamp,
            category: `HTTP${response.status}`,
            action: response.id,
          };
        })
    );
  }

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

  state: State = {
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
    if (!request) {
      return;
    }
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

    if (!selectedId) {
      return null;
    }
    const requestWithId = requests[selectedId];
    if (!requestWithId) {
      return null;
    }
    return (
      <RequestDetails
        key={selectedId}
        request={requestWithId}
        response={responses[selectedId]}
      />
    );
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
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
  clear: () => void;
  copyRequestCurlCommand: () => void;
  onRowHighlighted: (keys: TableHighlightedRows) => void;
  highlightedRows: Set<string> | null | undefined;
  routes: Map<RequestId, Route>;
  handleRoutesChange: (routes: Map<RequestId, Route>) => void;
  onMockButtonPressed: () => void;
  onCloseButtonPressed: () => void;
  showMockResponseDialog: boolean;
  isMockResponseSupported: boolean;
};

type NetworkTableState = {
  sortedRows: TableRows;
  routes: Map<RequestId, Route>;
};

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

function buildRow(
  request: Request,
  response: Response | null | undefined,
): TableBodyRow | null | undefined {
  if (request == null) {
    return null;
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
  .map(
    ({key, value}: {key: string; value: string}): string =>
      `${key}: ${String(value)}`,
  )
  .join('\n')}`;

  const requestData = request.data ? decodeBody(request) : null;
  const responseData = response && response.data ? decodeBody(response) : null;

  if (requestData) {
    copyText += `\n\n${requestData}`;
  }

  if (response) {
    copyText += `

## Response
HTTP ${response.status} ${response.reason}
${response.headers
  .map(
    ({key, value}: {key: string; value: string}): string =>
      `${key}: ${String(value)}`,
  )
  .join('\n')}`;
  }

  if (responseData) {
    copyText += `\n\n${responseData}`;
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
    requestBody: requestData,
    responseBody: responseData,
  };
}

function calculateState(
  props: {
    requests: {[id: string]: Request};
    responses: {[id: string]: Response};
  },
  nextProps: NetworkTableProps,
  rows: TableRows = [],
): NetworkTableState {
  const routes = new Map([...nextProps.routes]);
  rows = [...rows];
  if (Object.keys(nextProps.requests).length === 0) {
    // cleared
    rows = [];
  } else if (props.requests !== nextProps.requests) {
    // new request
    for (const [requestId, request] of Object.entries(nextProps.requests)) {
      if (props.requests[requestId] == null) {
        const newRow = buildRow(request, nextProps.responses[requestId]);
        if (newRow) {
          rows.push(newRow);
        }
      }
    }
  } else if (props.responses !== nextProps.responses) {
    // new response
    const resId = Object.keys(nextProps.responses).find(
      (responseId: RequestId) => !props.responses[responseId],
    );
    if (resId) {
      const request = nextProps.requests[resId];
      // sanity check; to pass null check
      if (request) {
        const newRow = buildRow(request, nextProps.responses[resId]);
        const index = rows.findIndex((r: TableBodyRow) => r.key === request.id);
        if (index > -1 && newRow) {
          rows[index] = newRow;
        }
      }
    }
  }

  rows.sort(
    (a: TableBodyRow, b: TableBodyRow) => Number(a.sortKey) - Number(b.sortKey),
  );

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
      },
      props,
    );
  }

  componentWillReceiveProps(nextProps: NetworkTableProps) {
    this.setState(calculateState(this.props, nextProps, this.state.sortedRows));
  }

  contextMenuItems(): Array<MenuItemConstructorOptions> {
    type ContextMenuType =
      | 'normal'
      | 'separator'
      | 'submenu'
      | 'checkbox'
      | 'radio';
    const separator: ContextMenuType = 'separator';
    const {clear, copyRequestCurlCommand, highlightedRows} = this.props;
    const highlightedMenuItems =
      highlightedRows && highlightedRows.size === 1
        ? [
            {
              type: separator,
            },
            {
              label: 'Copy as cURL',
              click: copyRequestCurlCommand,
            },
          ]
        : [];

    return highlightedMenuItems.concat([
      {
        type: separator,
      },
      {
        label: 'Clear all',
        click: clear,
      },
    ]);
  }

  render() {
    return (
      <NetworkTable.ContextMenu
        items={this.contextMenuItems()}
        component={FlexColumn}>
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
          allowBodySearch={true}
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
  children?: number;
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
  request: Request;
  response: Response | null | undefined;
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
  response: Response | null | undefined;
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

  getResponseLength(response: Response | null | undefined) {
    if (!response) {
      return 0;
    }

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

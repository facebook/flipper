/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {padStart} from 'lodash';
import React, {createContext} from 'react';
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
  Sheet,
  TableHighlightedRows,
  TableRows,
  TableBodyRow,
  produce,
} from 'flipper';
import {
  Request,
  RequestId,
  Response,
  Route,
  ResponseFollowupChunk,
  Header,
  MockRoute,
} from './types';
import {convertRequestToCurlCommand, getHeaderValue, decodeBody} from './utils';
import RequestDetails from './RequestDetails';
import {clipboard} from 'electron';
import {URL} from 'url';
import {MockResponseDialog} from './MockResponseDialog';
import {combineBase64Chunks} from './chunks';
import {PluginClient, createState, usePlugin, useValue} from 'flipper-plugin';

const LOCALSTORAGE_MOCK_ROUTE_LIST_KEY = '__NETWORK_CACHED_MOCK_ROUTE_LIST';

export const BodyOptions = {
  formatted: 'formatted',
  parsed: 'parsed',
};

type Events = {
  newRequest: Request;
  newResponse: Response;
  partialResponse: Response | ResponseFollowupChunk;
};

type Methods = {
  mockResponses(params: {routes: MockRoute[]}): Promise<void>;
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

const mockingStyle = {
  backgroundColor: colors.yellowTint,
  color: colors.yellow,
  fontWeight: 500,
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

// State management
export interface NetworkRouteManager {
  addRoute(): void;
  modifyRoute(id: string, routeChange: Partial<Route>): void;
  removeRoute(id: string): void;
  copyHighlightedCalls(
    highlightedRows: Set<string>,
    requests: {[id: string]: Request},
    responses: {[id: string]: Response},
  ): void;
}
const nullNetworkRouteManager: NetworkRouteManager = {
  addRoute() {},
  modifyRoute(_id: string, _routeChange: Partial<Route>) {},
  removeRoute(_id: string) {},
  copyHighlightedCalls(
    _highlightedRows: Set<string>,
    _requests: {[id: string]: Request},
    _responses: {[id: string]: Response},
  ) {},
};
export const NetworkRouteContext = createContext<NetworkRouteManager>(
  nullNetworkRouteManager,
);

export function plugin(client: PluginClient<Events, Methods>) {
  const networkRouteManager = createState<NetworkRouteManager>(
    nullNetworkRouteManager,
  );

  const selectedIds = createState<Array<RequestId>>([]);
  const searchTerm = createState<string>('');
  const routes = createState<{[id: string]: Route}>({});
  const nextRouteId = createState<number>(0);
  const isMockResponseSupported = createState<boolean>(false);
  const showMockResponseDialog = createState<boolean>(false);
  const detailBodyFormat = createState<string>(BodyOptions.parsed);
  const highlightedRows = createState<Set<string> | null | undefined>(
    new Set(),
  );
  const isDeeplinked = createState<boolean>(false);
  const requests = createState<{[id: string]: Request}>(
    {},
    {persist: 'requests'},
  );
  const responses = createState<{[id: string]: Response}>(
    {},
    {persist: 'responses'},
  );

  const partialResponses = createState<{
    [id: string]: {
      initialResponse?: Response;
      followupChunks: {[id: number]: string};
    };
  }>({}, {persist: 'partialResponses'});

  client.onDeepLink((payload: unknown) => {
    if (typeof payload === 'string') {
      parseDeepLinkPayload(payload);
      isDeeplinked.set(true);
    }
  });

  client.addMenuEntry({
    action: 'clear',
    handler: clearLogs,
  });

  client.onConnect(() => {
    init();
  });

  client.onDeactivate(() => {
    isDeeplinked.set(false);
  });

  client.onMessage('newRequest', (data) => {
    requests.update((draft) => {
      draft[data.id] = data;
    });
  });

  client.onMessage('newResponse', (data) => {
    responses.update((draft) => {
      draft[data.id] = data;
    });
  });

  client.onMessage('partialResponse', (data) => {
    /* Some clients (such as low end Android devices) struggle to serialise large payloads in one go, so partial responses allow them
        to split payloads into chunks and serialise each individually.

        Such responses will be distinguished between normal responses by both:
          * Being sent to the partialResponse method.
          * Having a totalChunks value > 1.

        The first chunk will always be included in the initial response. This response must have index 0.
        The remaining chunks will be sent in ResponseFollowupChunks, which each contain another piece of the payload, along with their index from 1 onwards.
        The payload of each chunk is individually encoded in the same way that full responses are.

        The order that initialResponse, and followup chunks are recieved is not guaranteed to be in index order.
    */
    const message: Response | ResponseFollowupChunk = data as
      | Response
      | ResponseFollowupChunk;
    if (message.index !== undefined && message.index > 0) {
      // It's a follow up chunk
      const followupChunk: ResponseFollowupChunk = message as ResponseFollowupChunk;
      const partialResponseEntry = partialResponses.get()[followupChunk.id] ?? {
        followupChunks: {},
      };

      const newPartialResponseEntry = produce(partialResponseEntry, (draft) => {
        draft.followupChunks[followupChunk.index] = followupChunk.data;
      });
      const newPartialResponse = {
        ...partialResponses.get(),
        [followupChunk.id]: newPartialResponseEntry,
      };

      assembleChunksIfResponseIsComplete(newPartialResponse, followupChunk.id);
      return;
    }
    // It's an initial chunk
    const partialResponse: Response = message as Response;
    const partialResponseEntry = partialResponses.get()[partialResponse.id] ?? {
      followupChunks: {},
    };
    const newPartialResponseEntry = {
      ...partialResponseEntry,
      initialResponse: partialResponse,
    };
    const newPartialResponse = {
      ...partialResponses.get(),
      [partialResponse.id]: newPartialResponseEntry,
    };
    assembleChunksIfResponseIsComplete(newPartialResponse, partialResponse.id);
  });

  function assembleChunksIfResponseIsComplete(
    partialResp: {
      [id: string]: {
        initialResponse?: Response;
        followupChunks: {[id: number]: string};
      };
    },
    responseId: string,
  ) {
    const partialResponseEntry = partialResp[responseId];
    const numChunks = partialResponseEntry.initialResponse?.totalChunks;
    if (
      !partialResponseEntry.initialResponse ||
      !numChunks ||
      Object.keys(partialResponseEntry.followupChunks).length + 1 < numChunks
    ) {
      // Partial response not yet complete, do nothing.
      partialResponses.set(partialResp);
      return;
    }
    // Partial response has all required chunks, convert it to a full Response.

    const response: Response = partialResponseEntry.initialResponse;
    const allChunks: string[] =
      response.data != null
        ? [
            response.data,
            ...Object.entries(partialResponseEntry.followupChunks)
              // It's important to parseInt here or it sorts lexicographically
              .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
              .map(([_k, v]: [string, string]) => v),
          ]
        : [];
    const data = combineBase64Chunks(allChunks);

    const newResponse = {
      ...response,
      // Currently data is always decoded at render time, so re-encode it to match the single response format.
      data: btoa(data),
    };

    responses.update((draft) => {
      draft[newResponse.id] = newResponse;
    });

    partialResponses.update((draft) => {
      delete draft[newResponse.id];
    });
  }

  function init() {
    client.supportsMethod('mockResponses').then((result) => {
      const newRoutes = JSON.parse(
        localStorage.getItem(LOCALSTORAGE_MOCK_ROUTE_LIST_KEY) || '{}',
      );
      routes.set(newRoutes);
      isMockResponseSupported.set(result);
      showMockResponseDialog.set(false);
      nextRouteId.set(Object.keys(routes).length);

      informClientMockChange(routes.get());
    });

    // declare new variable to be called inside the interface
    networkRouteManager.set({
      addRoute() {
        const newNextRouteId = nextRouteId.get();
        routes.update((draft) => {
          draft[newNextRouteId.toString()] = {
            requestUrl: '',
            requestMethod: 'GET',
            responseData: '',
            responseHeaders: {},
            responseStatus: '200',
          };
        });
        nextRouteId.set(newNextRouteId + 1);
      },
      modifyRoute(id: string, routeChange: Partial<Route>) {
        if (!routes.get().hasOwnProperty(id)) {
          return;
        }
        routes.update((draft) => {
          Object.assign(draft[id], routeChange);
        });
        informClientMockChange(routes.get());
      },
      removeRoute(id: string) {
        if (routes.get().hasOwnProperty(id)) {
          routes.update((draft) => {
            delete draft[id];
          });
        }
        informClientMockChange(routes.get());
      },
      copyHighlightedCalls(
        highlightedRows: Set<string> | null | undefined,
        requests: {[id: string]: Request},
        responses: {[id: string]: Response},
      ) {
        // iterate through highlighted rows
        highlightedRows?.forEach((row) => {
          const response = responses[row];
          // convert headers
          const headers: {[id: string]: Header} = {};
          response.headers.forEach((e) => {
            headers[e.key] = e;
          });

          // convert data TODO: we only want this for non-binary data! See D23403095
          const responseData =
            response && response.data ? decodeBody(response) : null;

          const newNextRouteId = nextRouteId.get();
          routes.update((draft) => {
            draft[newNextRouteId.toString()] = {
              requestUrl: requests[row].url,
              requestMethod: requests[row].method,
              responseData: responseData as string,
              responseHeaders: headers,
              responseStatus: responses[row].status.toString(),
            };
          });
          nextRouteId.set(newNextRouteId + 1);
        });

        informClientMockChange(routes.get());
      },
    });
  }

  function parseDeepLinkPayload(deepLinkPayload: unknown) {
    const searchTermDelim = 'searchTerm=';
    if (typeof deepLinkPayload !== 'string') {
      selectedIds.set([]);
      searchTerm.set('');
    } else if (deepLinkPayload.startsWith(searchTermDelim)) {
      selectedIds.set([]);
      searchTerm.set(deepLinkPayload.slice(searchTermDelim.length));
    } else {
      selectedIds.set([deepLinkPayload]);
      searchTerm.set('');
    }
  }

  function clearLogs() {
    selectedIds.set([]);
    responses.set({});
    requests.set({});
  }

  function copyRequestCurlCommand() {
    // Ensure there is only one row highlighted.
    if (selectedIds.get().length !== 1) {
      return;
    }

    const request = requests.get()[selectedIds.get()[0]];
    if (!request) {
      return;
    }
    const command = convertRequestToCurlCommand(request);
    clipboard.writeText(command);
  }

  async function informClientMockChange(routes: {[id: string]: Route}) {
    const existedIdSet: {[id: string]: {[method: string]: boolean}} = {};
    const filteredRoutes: {[id: string]: Route} = Object.entries(routes).reduce(
      (accRoutes, [id, route]) => {
        if (existedIdSet.hasOwnProperty(route.requestUrl)) {
          if (
            existedIdSet[route.requestUrl].hasOwnProperty(route.requestMethod)
          ) {
            return accRoutes;
          }
          existedIdSet[route.requestUrl] = {
            ...existedIdSet[route.requestUrl],
            [route.requestMethod]: true,
          };
          return Object.assign({[id]: route}, accRoutes);
        } else {
          existedIdSet[route.requestUrl] = {
            [route.requestMethod]: true,
          };
          return Object.assign({[id]: route}, accRoutes);
        }
      },
      {},
    );

    if (isMockResponseSupported.get()) {
      const routesValuesArray = Object.values(filteredRoutes);
      localStorage.setItem(
        LOCALSTORAGE_MOCK_ROUTE_LIST_KEY,
        JSON.stringify(routesValuesArray),
      );

      try {
        await client.send('mockResponses', {
          routes: routesValuesArray.map((route: Route) => ({
            requestUrl: route.requestUrl,
            method: route.requestMethod,
            data: route.responseData,
            headers: [...Object.values(route.responseHeaders)],
            status: route.responseStatus,
          })),
        });
      } catch (e) {
        console.error('Failed to mock responses.', e);
      }
    }
  }

  return {
    selectedIds,
    searchTerm,
    routes,
    nextRouteId,
    isMockResponseSupported,
    showMockResponseDialog,
    detailBodyFormat,
    highlightedRows,
    isDeeplinked,
    requests,
    responses,
    partialResponses,
    networkRouteManager,
    clearLogs,
    onRowHighlighted(selectedIdsArr: Array<RequestId>) {
      selectedIds.set(selectedIdsArr);
    },
    onMockButtonPressed() {
      showMockResponseDialog.set(true);
    },
    onCloseButtonPressed() {
      showMockResponseDialog.set(false);
    },
    onSelectFormat(bodyFormat: string) {
      detailBodyFormat.set(bodyFormat);
    },
    copyRequestCurlCommand,
    init,
  };
}

export function Component() {
  const instance = usePlugin(plugin);

  const requests = useValue(instance.requests);
  const responses = useValue(instance.responses);
  const selectedIds = useValue(instance.selectedIds);
  const searchTerm = useValue(instance.searchTerm);
  const routes = useValue(instance.routes);
  const isMockResponseSupported = useValue(instance.isMockResponseSupported);
  const showMockResponseDialog = useValue(instance.showMockResponseDialog);
  const networkRouteManager = useValue(instance.networkRouteManager);

  return (
    <FlexColumn grow={true}>
      <NetworkRouteContext.Provider value={networkRouteManager}>
        <NetworkTable
          requests={requests || {}}
          responses={responses || {}}
          routes={routes}
          onMockButtonPressed={instance.onMockButtonPressed}
          onCloseButtonPressed={instance.onCloseButtonPressed}
          showMockResponseDialog={showMockResponseDialog}
          clear={instance.clearLogs}
          copyRequestCurlCommand={instance.copyRequestCurlCommand}
          onRowHighlighted={instance.onRowHighlighted}
          highlightedRows={selectedIds ? new Set(selectedIds) : null}
          searchTerm={searchTerm}
          isMockResponseSupported={isMockResponseSupported}
        />
        <Sidebar />
      </NetworkRouteContext.Provider>
    </FlexColumn>
  );
}

type NetworkTableProps = {
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
  routes: {[id: string]: Route};
  clear: () => void;
  copyRequestCurlCommand: () => void;
  onRowHighlighted: (keys: TableHighlightedRows) => void;
  highlightedRows: Set<string> | null | undefined;
  searchTerm: string;
  onMockButtonPressed: () => void;
  onCloseButtonPressed: () => void;
  showMockResponseDialog: boolean;
  isMockResponseSupported: boolean;
};

type NetworkTableState = {
  sortedRows: TableRows;
  routes: {[id: string]: Route};
  highlightedRows: Set<string> | null | undefined;
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
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

  if (request.url == null) {
    return null;
  }
  let url: URL | undefined = undefined;
  try {
    url = new URL(request.url);
  } catch (e) {
    console.warn(`Failed to parse url: '${request.url}'`, e);
  }
  const domain = url ? url.host + url.pathname : '<unknown>';
  const friendlyName = getHeaderValue(request.headers, 'X-FB-Friendly-Name');
  const style = response && response.isMock ? mockingStyle : undefined;

  const copyText = () => {
    let copyText = `# HTTP request for ${domain} (ID: ${request.id})
  ## Request
  HTTP ${request.method} ${request.url}
  ${request.headers
    .map(
      ({key, value}: {key: string; value: string}): string =>
        `${key}: ${String(value)}`,
    )
    .join('\n')}`;

    // TODO: we want decoding only for non-binary data! See D23403095
    const requestData = request.data ? decodeBody(request) : null;
    const responseData =
      response && response.data ? decodeBody(response) : null;

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
    return copyText;
  };

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
    getSearchContent: copyText,
    highlightOnHover: true,
    style: style,
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
  }
  if (props.responses !== nextProps.responses) {
    // new or updated response
    const resIds = Object.keys(nextProps.responses).filter(
      (responseId: RequestId) =>
        props.responses[responseId] !== nextProps.responses[responseId],
    );
    for (const resId of resIds) {
      if (resId) {
        const request = nextProps.requests[resId];
        // sanity check; to pass null check
        if (request) {
          const newRow = buildRow(request, nextProps.responses[resId]);
          const index = rows.findIndex(
            (r: TableBodyRow) => r.key === request.id,
          );
          if (index > -1 && newRow) {
            rows[index] = newRow;
          }
        }
      }
    }
  }

  rows.sort(
    (a: TableBodyRow, b: TableBodyRow) =>
      (a.sortKey as number) - (b.sortKey as number),
  );

  return {
    sortedRows: rows,
    routes: nextProps.routes,
    highlightedRows: nextProps.highlightedRows,
    requests: props.requests,
    responses: props.responses,
  };
}

function Sidebar() {
  const instance = usePlugin(plugin);
  const requests = useValue(instance.requests);
  const responses = useValue(instance.responses);
  const selectedIds = useValue(instance.selectedIds);
  const detailBodyFormat = useValue(instance.detailBodyFormat);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  if (!selectedId) {
    return null;
  }
  const requestWithId = requests[selectedId];
  if (!requestWithId) {
    return null;
  }

  return (
    <DetailSidebar width={500}>
      <RequestDetails
        key={selectedId}
        request={requestWithId}
        response={responses[selectedId]}
        bodyFormat={detailBodyFormat}
        onSelectFormat={instance.onSelectFormat}
      />
    </DetailSidebar>
  );
}

class NetworkTable extends PureComponent<NetworkTableProps, NetworkTableState> {
  static ContextMenu = styled(ContextMenu)({
    flex: 1,
  });

  constructor(props: NetworkTableProps) {
    super(props);
    this.state = calculateState({requests: {}, responses: {}}, props);
  }

  UNSAFE_componentWillReceiveProps(nextProps: NetworkTableProps) {
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
      <>
        <NetworkTable.ContextMenu
          items={this.contextMenuItems()}
          component={FlexColumn}>
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
            allowContentSearch={true}
            zebra={false}
            clearSearchTerm={this.props.searchTerm !== ''}
            defaultSearchTerm={this.props.searchTerm}
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
        {this.props.showMockResponseDialog ? (
          <Sheet>
            {(onHide) => (
              <MockResponseDialog
                routes={this.state.routes}
                onHide={() => {
                  onHide();
                  this.props.onCloseButtonPressed();
                }}
                highlightedRows={this.state.highlightedRows}
                requests={this.state.requests}
                responses={this.state.responses}
              />
            )}
          </Sheet>
        ) : null}
      </>
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

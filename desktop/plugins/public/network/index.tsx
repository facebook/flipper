/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {createContext, createRef} from 'react';
import {Menu, message} from 'antd';

import {
  Layout,
  Button,
  Glyph,
  colors,
  DetailSidebar,
  styled,
  Sheet,
} from 'flipper';
import {
  Request,
  RequestInfo,
  ResponseInfo,
  Route,
  ResponseFollowupChunk,
  Header,
  MockRoute,
  AddProtobufEvent,
  PartialResponses,
  Requests,
} from './types';
import {ProtobufDefinitionsRepository} from './ProtobufDefinitionsRepository';
import {
  convertRequestToCurlCommand,
  getHeaderValue,
  decodeBody,
  getResponseLength,
} from './utils';
import RequestDetails from './RequestDetails';
import {URL} from 'url';
import {MockResponseDialog} from './MockResponseDialog';
import {assembleChunksIfResponseIsComplete} from './chunks';
import {
  PluginClient,
  Device,
  createState,
  usePlugin,
  useValue,
  createDataSource,
  DataTable,
  DataTableColumn,
  DataTableManager,
} from 'flipper-plugin';
import fs from 'fs';
// eslint-disable-next-line
import electron, {OpenDialogOptions, remote} from 'electron';
import {DeleteOutlined} from '@ant-design/icons';

const LOCALSTORAGE_MOCK_ROUTE_LIST_KEY = '__NETWORK_CACHED_MOCK_ROUTE_LIST';
const LOCALSTORAGE_RESPONSE_BODY_FORMAT_KEY =
  '__NETWORK_CACHED_RESPONSE_BODY_FORMAT';

export const BodyOptions = {
  formatted: 'formatted',
  parsed: 'parsed',
};

type Events = {
  newRequest: RequestInfo;
  newResponse: ResponseInfo;
  partialResponse: ResponseInfo | ResponseFollowupChunk;
  addProtobufDefinitions: AddProtobufEvent;
};

type Methods = {
  mockResponses(params: {routes: MockRoute[]}): Promise<void>;
};

const mockingStyle = {
  backgroundColor: colors.yellowTint,
  color: colors.yellow,
  fontWeight: 500,
};

const errorStyle = {
  backgroundColor: colors.redTint,
  color: colors.red,
  fontWeight: 500,
};

export function formatBytes(count: number | undefined): string {
  if (typeof count !== 'number') {
    return '';
  }
  if (count > 1024 * 1024) {
    return (count / (1024.0 * 1024)).toFixed(1) + ' MB';
  }
  if (count > 1024) {
    return (count / 1024.0).toFixed(1) + ' kB';
  }
  return count + ' B';
}

// State management
export interface NetworkRouteManager {
  addRoute(): string | null;
  modifyRoute(id: string, routeChange: Partial<Route>): void;
  removeRoute(id: string): void;
  enableRoute(id: string): void;
  copyHighlightedCalls(highlightedRows: Set<string>, requests: Requests): void;
  importRoutes(): void;
  exportRoutes(): void;
  clearRoutes(): void;
}
const nullNetworkRouteManager: NetworkRouteManager = {
  addRoute(): string | null {
    return '';
  },
  modifyRoute(_id: string, _routeChange: Partial<Route>) {},
  removeRoute(_id: string) {},
  enableRoute(_id: string) {},
  copyHighlightedCalls(_highlightedRows: Set<string>, _requests: Requests) {},
  importRoutes() {},
  exportRoutes() {},
  clearRoutes() {},
};
export const NetworkRouteContext = createContext<NetworkRouteManager>(
  nullNetworkRouteManager,
);

export function plugin(client: PluginClient<Events, Methods>) {
  const networkRouteManager = createState<NetworkRouteManager>(
    nullNetworkRouteManager,
  );

  const routes = createState<{[id: string]: Route}>({});
  const nextRouteId = createState<number>(0);
  const isMockResponseSupported = createState<boolean>(false);
  const showMockResponseDialog = createState<boolean>(false);
  const detailBodyFormat = createState<string>(
    localStorage.getItem(LOCALSTORAGE_RESPONSE_BODY_FORMAT_KEY) ||
      BodyOptions.parsed,
  );
  const requests = createDataSource<Request, 'id'>([], {
    key: 'id',
    persist: 'requests2',
  });
  const selectedId = createState<string | undefined>(undefined, {
    persist: 'selectedId',
  });
  const tableManagerRef = createRef<undefined | DataTableManager<Request>>();

  const partialResponses = createState<PartialResponses>(
    {},
    {persist: 'partialResponses'},
  );

  client.onDeepLink((payload: unknown) => {
    const searchTermDelim = 'searchTerm=';
    if (typeof payload !== 'string') {
      return;
    } else if (payload.startsWith(searchTermDelim)) {
      tableManagerRef.current?.clearSelection();
      tableManagerRef.current?.setSearchValue(
        payload.slice(searchTermDelim.length),
      );
    } else {
      tableManagerRef.current?.setSearchValue('');
      tableManagerRef.current?.selectItemById(payload);
    }
  });

  client.addMenuEntry({
    action: 'clear',
    handler: clearLogs,
  });

  client.onConnect(() => {
    init();
  });

  client.onMessage('newRequest', (data) => {
    // TODO: This should be append, but there is currently a bug where requests are send multiple times from the
    // device! (Wilde on emulator)
    requests.upsert(createRequestFromRequestInfo(data));
  });

  function storeResponse(response: ResponseInfo) {
    const request = requests.getById(response.id);
    if (!request) {
      return; // request table might have been cleared
    }

    requests.upsert(updateRequestWithResponseInfo(request, response));
  }

  client.onMessage('newResponse', (data) => {
    storeResponse(data);
  });

  client.onMessage('addProtobufDefinitions', (data) => {
    const repository = ProtobufDefinitionsRepository.getInstance();
    for (const [baseUrl, definitions] of Object.entries(data)) {
      repository.addDefinitions(baseUrl, definitions);
    }
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

        The order that initialResponse, and followup chunks are received is not guaranteed to be in index order.
    */
    const message = data as ResponseInfo | ResponseFollowupChunk;

    partialResponses.update((draft) => {
      if (!draft[message.id]) {
        draft[message.id] = {
          followupChunks: {},
        };
      }
      const entry = draft[message.id];
      if (message.index !== undefined && message.index > 0) {
        // It's a follow up chunk
        const chunk = message as ResponseFollowupChunk;
        entry.followupChunks[chunk.index] = chunk.data;
      } else {
        // It's an initial chunk
        entry.initialResponse = message as ResponseInfo;
      }
    });
    const response = assembleChunksIfResponseIsComplete(
      partialResponses.get()[message.id],
    );
    if (response) {
      storeResponse(response);
      partialResponses.update((draft) => {
        delete draft[response.id];
      });
    }
  });

  function supportsMocks(device: Device): Promise<boolean> {
    if (device.isArchived) {
      return Promise.resolve(true);
    } else {
      return client.supportsMethod('mockResponses');
    }
  }

  function init() {
    supportsMocks(client.device).then((result) => {
      const newRoutes = JSON.parse(
        localStorage.getItem(LOCALSTORAGE_MOCK_ROUTE_LIST_KEY + client.appId) ||
          '{}',
      );
      routes.set(newRoutes);
      isMockResponseSupported.set(result);
      showMockResponseDialog.set(false);
      nextRouteId.set(Object.keys(routes.get()).length);

      informClientMockChange(routes.get());
    });

    // declare new variable to be called inside the interface
    networkRouteManager.set({
      addRoute(): string | null {
        const newNextRouteId = nextRouteId.get();
        routes.update((draft) => {
          draft[newNextRouteId.toString()] = {
            requestUrl: '',
            requestMethod: 'GET',
            responseData: '',
            responseHeaders: {},
            responseStatus: '200',
            enabled: true,
          };
        });
        nextRouteId.set(newNextRouteId + 1);
        return String(newNextRouteId);
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
      enableRoute(id: string) {
        if (routes.get().hasOwnProperty(id)) {
          routes.update((draft) => {
            draft[id].enabled = !draft[id].enabled;
          });
        }
        informClientMockChange(routes.get());
      },
      copyHighlightedCalls(
        highlightedRows: Set<string> | null | undefined,
        requests: Requests,
      ) {
        // iterate through highlighted rows
        highlightedRows?.forEach((row) => {
          const request = requests.getById(row);
          if (!request) {
            return;
          }
          // convert headers
          const headers: {[id: string]: Header} = {};
          request.responseHeaders?.forEach((e) => {
            headers[e.key] = e;
          });

          // convert data TODO: we only want this for non-binary data! See D23403095
          const responseData =
            request && request.responseData
              ? decodeBody({
                  headers: request.responseHeaders ?? [],
                  data: request.responseData,
                })
              : '';

          const newNextRouteId = nextRouteId.get();
          routes.update((draft) => {
            draft[newNextRouteId.toString()] = {
              requestUrl: request.url,
              requestMethod: request.method,
              responseData: responseData as string,
              responseHeaders: headers,
              responseStatus: request.status?.toString() ?? '',
              enabled: true,
            };
          });
          nextRouteId.set(newNextRouteId + 1);
        });

        informClientMockChange(routes.get());
      },
      importRoutes() {
        const options: OpenDialogOptions = {
          properties: ['openFile'],
          filters: [{extensions: ['json'], name: 'Flipper Route Files'}],
        };
        remote.dialog.showOpenDialog(options).then((result) => {
          const filePaths = result.filePaths;
          if (filePaths.length > 0) {
            fs.readFile(filePaths[0], 'utf8', (err, data) => {
              if (err) {
                message.error('Unable to import file');
                return;
              }
              const importedRoutes = JSON.parse(data);
              importedRoutes?.forEach((importedRoute: Route) => {
                if (importedRoute != null) {
                  const newNextRouteId = nextRouteId.get();
                  routes.update((draft) => {
                    draft[newNextRouteId.toString()] = {
                      requestUrl: importedRoute.requestUrl,
                      requestMethod: importedRoute.requestMethod,
                      responseData: importedRoute.responseData as string,
                      responseHeaders: importedRoute.responseHeaders,
                      responseStatus: importedRoute.responseStatus,
                      enabled: true,
                    };
                  });
                  nextRouteId.set(newNextRouteId + 1);
                }
              });
              informClientMockChange(routes.get());
            });
          }
        });
      },
      exportRoutes() {
        remote.dialog
          .showSaveDialog(
            // @ts-ignore This appears to work but isn't allowed by the types
            null,
            {
              title: 'Export Routes',
              defaultPath: 'NetworkPluginRoutesExport.json',
            },
          )
          .then((result: electron.SaveDialogReturnValue) => {
            const file = result.filePath;
            if (!file) {
              return;
            }
            fs.writeFile(
              file,
              JSON.stringify(Object.values(routes.get()), null, 2),
              'utf8',
              (err) => {
                if (err) {
                  message.error('Failed to store mock routes: ' + err);
                } else {
                  message.info('Successfully exported mock routes');
                }
              },
            );
          });
      },
      clearRoutes() {
        routes.set({});
        informClientMockChange(routes.get());
      },
    });
  }

  function clearLogs() {
    requests.clear();
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
        LOCALSTORAGE_MOCK_ROUTE_LIST_KEY + client.appId,
        JSON.stringify(routesValuesArray),
      );

      if (!client.device.isArchived) {
        try {
          await client.send('mockResponses', {
            routes: routesValuesArray
              .filter((e) => e.enabled)
              .map((route: Route) => ({
                requestUrl: route.requestUrl,
                method: route.requestMethod,
                data: route.responseData,
                headers: [...Object.values(route.responseHeaders)],
                status: route.responseStatus,
                enabled: route.enabled,
              })),
          });
        } catch (e) {
          console.error('Failed to mock responses.', e);
        }
      }
    }
  }

  return {
    routes,
    nextRouteId,
    isMockResponseSupported,
    showMockResponseDialog,
    detailBodyFormat,
    requests,
    partialResponses,
    networkRouteManager,
    clearLogs,
    onMockButtonPressed() {
      showMockResponseDialog.set(true);
    },
    onCloseButtonPressed() {
      showMockResponseDialog.set(false);
    },
    onSelectFormat(bodyFormat: string) {
      detailBodyFormat.set(bodyFormat);
      localStorage.setItem(LOCALSTORAGE_RESPONSE_BODY_FORMAT_KEY, bodyFormat);
    },
    selectedId,
    onSelect(request: Request) {
      selectedId.set(request?.id);
    },
    init,
    tableManagerRef,
    onContextMenu(request: Request | undefined) {
      return (
        <Menu.Item
          key="curl"
          onClick={() => {
            if (!request) {
              return;
            }
            const command = convertRequestToCurlCommand(request);
            client.writeTextToClipboard(command);
          }}>
          Copy cURL command
        </Menu.Item>
      );
    },
  };
}

function createRequestFromRequestInfo(data: RequestInfo): Request {
  let url: URL | undefined = undefined;
  try {
    url = data.url ? new URL(data.url) : undefined;
  } catch (e) {
    console.warn(`Failed to parse url: '${data.url}'`, e);
  }
  const domain =
    getHeaderValue(data.headers, 'X-FB-Friendly-Name') ||
    (url ? (url.pathname ? url.host + url.pathname : url.host) : '<unknown>');

  return {
    id: data.id,
    // request
    requestTime: new Date(data.timestamp),
    method: data.method,
    url: data.url ?? '',
    domain,
    requestHeaders: data.headers,
    requestData: data.data ?? undefined,
  };
}

function updateRequestWithResponseInfo(
  request: Request,
  response: ResponseInfo,
): Request {
  return {
    ...request,
    responseTime: new Date(response.timestamp),
    status: response.status,
    reason: response.reason,
    responseHeaders: response.headers,
    responseData: response.data ?? undefined,
    responseIsMock: response.isMock,
    responseLength: getResponseLength(response),
    duration: response.timestamp - request.requestTime.getTime(),
    insights: response.insights ?? undefined,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const routes = useValue(instance.routes);
  const isMockResponseSupported = useValue(instance.isMockResponseSupported);
  const showMockResponseDialog = useValue(instance.showMockResponseDialog);
  const networkRouteManager = useValue(instance.networkRouteManager);

  return (
    <NetworkRouteContext.Provider value={networkRouteManager}>
      <Layout.Container grow={true}>
        <DataTable
          columns={columns}
          dataSource={instance.requests}
          onRowStyle={getRowStyle}
          tableManagerRef={instance.tableManagerRef}
          onSelect={instance.onSelect}
          onCopyRows={copyRow}
          onContextMenu={instance.onContextMenu}
          enableAutoScroll
          extraActions={
            <Layout.Horizontal gap>
              <Button title="Clear logs" onClick={instance.clearLogs}>
                <DeleteOutlined />
              </Button>
              {isMockResponseSupported && (
                <Button onClick={instance.onMockButtonPressed}>Mock</Button>
              )}
            </Layout.Horizontal>
          }
        />
        {showMockResponseDialog ? (
          <Sheet>
            {(onHide) => (
              <MockResponseDialog
                routes={routes}
                onHide={() => {
                  onHide();
                  instance.onCloseButtonPressed();
                }}
                highlightedRows={
                  new Set(
                    instance.tableManagerRef
                      .current!.getSelectedItems()
                      .map((r) => r.id),
                  )
                }
                requests={instance.requests}
              />
            )}
          </Sheet>
        ) : null}
        <Sidebar />
      </Layout.Container>
    </NetworkRouteContext.Provider>
  );
}

const columns: DataTableColumn<Request>[] = [
  {
    key: 'requestTime',
    title: 'Request Time',
    width: 120,
  },
  {
    key: 'responseTime',
    title: 'Response Time',
    width: 120,
    visible: false,
  },
  {
    key: 'domain',
  },
  {
    key: 'url',
    title: 'Full URL',
    visible: false,
  },
  {
    key: 'method',
    title: 'Method',
    width: 70,
  },
  {
    key: 'status',
    title: 'Status',
    width: 70,
    formatters: formatStatus,
    align: 'right',
  },
  {
    key: 'responseLength',
    title: 'Size',
    width: 100,
    formatters: formatBytes,
    align: 'right',
  },
  {
    key: 'duration',
    title: 'Time',
    width: 100,
    formatters: formatDuration,
    align: 'right',
  },
];

function getRowStyle(row: Request) {
  return row.responseIsMock
    ? mockingStyle
    : row.status && row.status >= 400 && row.status < 600
    ? errorStyle
    : undefined;
}

function copyRow(requests: Request[]): string {
  const request = requests[0];
  if (!request || !request.url) {
    return '<empty request>';
  }

  let copyText = `# HTTP request for ${request.domain} (ID: ${request.id})
  ## Request
  HTTP ${request.method} ${request.url}
  ${request.requestHeaders
    .map(
      ({key, value}: {key: string; value: string}): string =>
        `${key}: ${String(value)}`,
    )
    .join('\n')}`;

  // TODO: we want decoding only for non-binary data! See D23403095
  const requestData = request.requestData
    ? decodeBody({
        headers: request.requestHeaders,
        data: request.requestData,
      })
    : null;
  const responseData = request.responseData
    ? decodeBody({
        headers: request.responseHeaders,
        data: request.responseData,
      })
    : null;

  if (requestData) {
    copyText += `\n\n${requestData}`;
  }
  if (request.status) {
    copyText += `

  ## Response
  HTTP ${request.status} ${request.reason}
  ${
    request.responseHeaders
      ?.map(
        ({key, value}: {key: string; value: string}): string =>
          `${key}: ${String(value)}`,
      )
      .join('\n') ?? ''
  }`;
  }

  if (responseData) {
    copyText += `\n\n${responseData}`;
  }
  return copyText;
}

function Sidebar() {
  const instance = usePlugin(plugin);
  const selectedId = useValue(instance.selectedId);
  const detailBodyFormat = useValue(instance.detailBodyFormat);

  const request = instance.requests.getById(selectedId!);
  if (!request) {
    return null;
  }

  return (
    <DetailSidebar width={500}>
      <RequestDetails
        key={selectedId}
        request={request}
        bodyFormat={detailBodyFormat}
        onSelectFormat={instance.onSelectFormat}
      />
    </DetailSidebar>
  );
}

const Icon = styled(Glyph)({
  marginTop: -3,
  marginRight: 3,
});

function formatStatus(status: number | undefined) {
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return (
      <>
        <Icon name="stop" color={colors.red} />
        {status}
      </>
    );
  }
  return status;
}

function formatDuration(duration: number | undefined) {
  if (typeof duration === 'number') return duration + 'ms';
  return '';
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {createRef} from 'react';
import {
  Button,
  Form,
  Input,
  Menu,
  message,
  Modal,
  Radio,
  Typography,
} from 'antd';

import {
  Layout,
  DetailSidebar,
  PluginClient,
  Device,
  createState,
  usePlugin,
  useValue,
  createDataSource,
  DataTable,
  DataTableColumn,
  DataTableManager,
  theme,
  renderReactRoot,
  batch,
} from 'flipper-plugin';
import {
  Request,
  RequestInfo,
  ResponseInfo,
  ResponseFollowupChunk,
  AddProtobufEvent,
  PartialResponses,
  SerializedRequest,
} from './types';
import {ProtobufDefinitionsRepository} from './ProtobufDefinitionsRepository';
import {
  convertRequestToCurlCommand,
  getHeaderValue,
  getResponseLength,
  formatStatus,
  formatBytes,
  formatDuration,
  requestsToText,
  decodeBody,
} from './utils';
import RequestDetails from './RequestDetails';
import {URL} from 'url';
import {assembleChunksIfResponseIsComplete} from './chunks';
import {DeleteOutlined} from '@ant-design/icons';
import {ManageMockResponsePanel} from './request-mocking/ManageMockResponsePanel';
import {
  NetworkRouteContext,
  NetworkRouteManager,
  nullNetworkRouteManager,
  Route,
  MockRoute,
  createNetworkManager,
  computeMockRoutes,
} from './request-mocking/NetworkRouteManager';
import {Base64} from 'js-base64';

const LOCALSTORAGE_MOCK_ROUTE_LIST_KEY = '__NETWORK_CACHED_MOCK_ROUTE_LIST';
const LOCALSTORAGE_RESPONSE_BODY_FORMAT_KEY =
  '__NETWORK_CACHED_RESPONSE_BODY_FORMAT';

export const BodyOptions = ['formatted', 'parsed'].map((value) => ({
  label: value,
  value,
}));

type Events = {
  newRequest: RequestInfo;
  newResponse: ResponseInfo;
  partialResponse: ResponseInfo | ResponseFollowupChunk;
  addProtobufDefinitions: AddProtobufEvent;
};

type Methods = {
  mockResponses(params: {routes: MockRoute[]}): Promise<void>;
};

type CustomColumnConfig = {
  header: string;
  type: 'response' | 'request';
};

type StateExport = {
  requests2: SerializedRequest[];
  isMockResponseSupported: boolean;
  selectedId: string | undefined;
  customColumns: CustomColumnConfig[];
};

export function plugin(client: PluginClient<Events, Methods>) {
  const networkRouteManager = createState<NetworkRouteManager>(
    nullNetworkRouteManager,
  );

  const routes = createState<{[id: string]: Route}>({});
  const nextRouteId = createState<number>(0);
  const isMockResponseSupported = createState<boolean>(false);
  const showMockResponseDialog = createState<boolean>(false);
  const detailBodyFormat = createState<string>(
    localStorage.getItem(LOCALSTORAGE_RESPONSE_BODY_FORMAT_KEY) || 'parsed',
  );
  const requests = createDataSource<Request, 'id'>([], {
    key: 'id',
  });
  const selectedId = createState<string | undefined>(undefined);
  const tableManagerRef = createRef<undefined | DataTableManager<Request>>();

  const partialResponses = createState<PartialResponses>({});

  const customColumns = createState<CustomColumnConfig[]>([], {
    persist: 'customColumns',
    persistToLocalStorage: true,
  });
  const columns = createState<DataTableColumn<Request>[]>(baseColumns); // not persistable

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
    requests.append(createRequestFromRequestInfo(data, customColumns.get()));
  });

  function storeResponse(response: ResponseInfo) {
    const request = requests.getById(response.id);
    if (!request) {
      return; // request table might have been cleared
    }

    requests.upsert(
      updateRequestWithResponseInfo(request, response, customColumns.get()),
    );
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

  async function supportsMocks(device: Device): Promise<boolean> {
    if (device.isArchived) {
      return isMockResponseSupported.get();
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
      batch(() => {
        routes.set(newRoutes);
        isMockResponseSupported.set(result);
        showMockResponseDialog.set(false);
        nextRouteId.set(Object.keys(routes.get()).length);
      });

      informClientMockChange(routes.get());
    });

    // declare new variable to be called inside the interface
    networkRouteManager.set(
      createNetworkManager(
        nextRouteId,
        routes,
        informClientMockChange,
        tableManagerRef,
      ),
    );
  }

  function clearLogs() {
    requests.clear();
  }

  async function informClientMockChange(routes: {[id: string]: Route}) {
    const filteredRoutes: {[id: string]: Route} = computeMockRoutes(routes);

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

  function addCustomColumn(column: CustomColumnConfig) {
    // prevent doubles
    if (
      customColumns
        .get()
        .find((c) => c.header === column.header && c.type === column.type)
    ) {
      return;
    }
    // add custom column config
    customColumns.update((d) => {
      d.push(column);
    });
    // generate DataTable column config
    addDataTableColumnConfig(column);
    // update existing entries
    for (let i = 0; i < requests.size; i++) {
      const request = requests.get(i);
      requests.update(i, {
        ...request,
        [`${column.type}_header_${column.header}`]: getHeaderValue(
          column.type === 'request'
            ? request.requestHeaders
            : request.responseHeaders,
          column.header,
        ),
      });
    }
  }

  function addDataTableColumnConfig(column: CustomColumnConfig) {
    columns.update((d) => {
      d.push({
        key: `${column.type}_header_${column.header}` as any,
        width: 200,
        title: `${column.header} (${column.type})`,
      });
    });
  }

  client.onReady(() => {
    // after restoring a snapshot, let's make sure we update the columns
    customColumns.get().forEach(addDataTableColumnConfig);
  });

  client.onExport<StateExport>(async (idler, onStatusMessage) => {
    const serializedRequests: SerializedRequest[] = [];
    for (let i = 0; i < requests.size; i++) {
      const request = requests.get(i);
      serializedRequests.push({
        ...request,
        requestTime: request.requestTime.getTime(),
        responseTime: request.responseTime?.getTime(),
        requestData:
          request.requestData instanceof Uint8Array
            ? [Base64.fromUint8Array(request.requestData)]
            : request.requestData,
        responseData:
          request.responseData instanceof Uint8Array
            ? [Base64.fromUint8Array(request.responseData)]
            : request.responseData,
      });
      if (idler.isCancelled()) {
        return;
      }
      if (idler.shouldIdle()) {
        onStatusMessage(`Serializing request ${i + 1}/${requests.size}`);
        await idler.idle();
      }
    }
    return {
      isMockResponseSupported: isMockResponseSupported.get(),
      selectedId: selectedId.get(),
      requests2: serializedRequests,
      customColumns: customColumns.get(),
    };
  });

  client.onImport<StateExport>((data) => {
    selectedId.set(data.selectedId);
    isMockResponseSupported.set(data.isMockResponseSupported);
    customColumns.set(data.customColumns);
    data.requests2.forEach((request) => {
      requests.append({
        ...request,
        requestTime: new Date(request.requestTime),
        responseTime:
          request.responseTime != null
            ? new Date(request.responseTime)
            : undefined,
        requestData: Array.isArray(request.requestData)
          ? Base64.toUint8Array(request.requestData[0])
          : request.requestData,
        responseData: Array.isArray(request.responseData)
          ? Base64.toUint8Array(request.responseData[0])
          : request.responseData,
      });
    });
  });

  return {
    columns,
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
        <>
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
          <Menu.Item
            key="custom header"
            onClick={() => {
              showCustomColumnDialog(addCustomColumn);
            }}>
            Add header column{'\u2026'}
          </Menu.Item>
        </>
      );
    },
    onCopyText(text: string) {
      client.writeTextToClipboard(text);
      message.success('Text copied to clipboard');
    },
    addCustomColumn,
  };
}

function showCustomColumnDialog(
  addCustomColumn: (column: CustomColumnConfig) => void,
) {
  function CustomColumnDialog({unmount}: {unmount(): void}) {
    const [form] = Form.useForm();
    return (
      <Modal
        title="Add custom column"
        visible
        onOk={() => {
          const header = form.getFieldValue('header');
          const type = form.getFieldValue('type');
          if (header && type) {
            addCustomColumn({
              header,
              type,
            });
            unmount();
          }
        }}
        onCancel={unmount}>
        <Form
          layout={'vertical'}
          form={form}
          initialValues={{
            type: 'response',
            header: '',
          }}>
          <Form.Item label="Header name" name="header">
            <Input placeholder="Header name" />
          </Form.Item>
          <Form.Item label="Header type" name="type">
            <Radio.Group>
              <Radio value={'request'}>Request</Radio>
              <Radio value={'response'}>Response</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    );
  }

  renderReactRoot((unmount) => <CustomColumnDialog unmount={unmount} />);
}

function createRequestFromRequestInfo(
  data: RequestInfo,
  customColumns: CustomColumnConfig[],
): Request {
  let url: URL | undefined = undefined;
  try {
    url = data.url ? new URL(data.url) : undefined;
  } catch (e) {
    console.warn(`Failed to parse url: '${data.url}'`, e);
  }
  const domain =
    getHeaderValue(data.headers, 'X-FB-Friendly-Name') ||
    (url ? (url.pathname ? url.host + url.pathname : url.host) : '<unknown>');

  const res = {
    id: data.id,
    // request
    requestTime: new Date(data.timestamp),
    method: data.method,
    url: data.url ?? '',
    domain,
    requestHeaders: data.headers,
    requestData: decodeBody(data.headers, data.data),
  };
  customColumns
    .filter((c) => c.type === 'request')
    .forEach(({header}) => {
      (res as any)['request_header_' + header] = getHeaderValue(
        data.headers,
        header,
      );
    });
  return res;
}

function updateRequestWithResponseInfo(
  request: Request,
  response: ResponseInfo,
  customColumns: CustomColumnConfig[],
): Request {
  const res = {
    ...request,
    responseTime: new Date(response.timestamp),
    status: response.status,
    reason: response.reason,
    responseHeaders: response.headers,
    responseData: decodeBody(response.headers, response.data),
    responseIsMock: response.isMock,
    responseLength: getResponseLength(response),
    duration: response.timestamp - request.requestTime.getTime(),
    insights: response.insights ?? undefined,
  };
  customColumns
    .filter((c) => c.type === 'response')
    .forEach(({header}) => {
      (res as any)['response_header_' + header] = getHeaderValue(
        response.headers,
        header,
      );
    });
  return res;
}

export function Component() {
  const instance = usePlugin(plugin);
  const routes = useValue(instance.routes);
  const isMockResponseSupported = useValue(instance.isMockResponseSupported);
  const showMockResponseDialog = useValue(instance.showMockResponseDialog);
  const networkRouteManager = useValue(instance.networkRouteManager);
  const columns = useValue(instance.columns);

  return (
    <NetworkRouteContext.Provider value={networkRouteManager}>
      <Layout.Container
        grow
        key={
          columns.length /* make sure to reset the table if colums change */
        }>
        <DataTable
          columns={columns}
          dataSource={instance.requests}
          onRowStyle={getRowStyle}
          tableManagerRef={instance.tableManagerRef}
          onSelect={instance.onSelect}
          onCopyRows={requestsToText}
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
        <Modal
          visible={showMockResponseDialog}
          onCancel={instance.onCloseButtonPressed}
          footer={null}
          title="Mock Network Responses"
          width={1200}>
          <ManageMockResponsePanel routes={routes} />
        </Modal>
        <DetailSidebar width={400}>
          <Sidebar />
        </DetailSidebar>
      </Layout.Container>
    </NetworkRouteContext.Provider>
  );
}

function Sidebar() {
  const instance = usePlugin(plugin);
  const selectedId = useValue(instance.selectedId);
  const detailBodyFormat = useValue(instance.detailBodyFormat);

  const request = instance.requests.getById(selectedId!);
  if (!request) {
    return (
      <Layout.Container pad grow center>
        <Typography.Text type="secondary">No request selected</Typography.Text>
      </Layout.Container>
    );
  }

  return (
    <RequestDetails
      key={selectedId}
      request={request}
      bodyFormat={detailBodyFormat}
      onSelectFormat={instance.onSelectFormat}
      onCopyText={instance.onCopyText}
    />
  );
}

const baseColumns: DataTableColumn<Request>[] = [
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

const mockingStyle = {
  color: theme.warningColor,
};

const errorStyle = {
  color: theme.errorColor,
};

function getRowStyle(row: Request) {
  return row.responseIsMock
    ? mockingStyle
    : row.status && row.status >= 400 && row.status < 600
    ? errorStyle
    : undefined;
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Request, Response, Header, Insights, RetryInsights} from './types';

import {
  Component,
  FlexColumn,
  ManagedTable,
  ManagedDataInspector,
  Text,
  Panel,
  Select,
  styled,
  colors,
  SmallText,
} from 'flipper';
import {decodeBody, getHeaderValue} from './utils';
import {formatBytes, BodyOptions} from './index';
import React from 'react';

import querystring from 'querystring';
import xmlBeautifier from 'xml-beautifier';

const WrappingText = styled(Text)({
  wordWrap: 'break-word',
  width: '100%',
  lineHeight: '125%',
  padding: '3px 0',
});

const KeyValueColumnSizes = {
  key: '30%',
  value: 'flex',
};

const KeyValueColumns = {
  key: {
    value: 'Key',
    resizable: false,
  },
  value: {
    value: 'Value',
    resizable: false,
  },
};

type RequestDetailsProps = {
  request: Request;
  response: Response | null | undefined;
  bodyFormat: string;
  onSelectFormat: (bodyFormat: string) => void;
};
export default class RequestDetails extends Component<RequestDetailsProps> {
  static Container = styled(FlexColumn)({
    height: '100%',
    overflow: 'auto',
  });

  urlColumns = (url: URL) => {
    return [
      {
        columns: {
          key: {value: <WrappingText>Full URL</WrappingText>},
          value: {
            value: <WrappingText>{url.href}</WrappingText>,
          },
        },
        copyText: url.href,
        key: 'url',
      },
      {
        columns: {
          key: {value: <WrappingText>Host</WrappingText>},
          value: {
            value: <WrappingText>{url.host}</WrappingText>,
          },
        },
        copyText: url.host,
        key: 'host',
      },
      {
        columns: {
          key: {value: <WrappingText>Path</WrappingText>},
          value: {
            value: <WrappingText>{url.pathname}</WrappingText>,
          },
        },
        copyText: url.pathname,
        key: 'path',
      },
      {
        columns: {
          key: {value: <WrappingText>Query String</WrappingText>},
          value: {
            value: <WrappingText>{url.search}</WrappingText>,
          },
        },
        copyText: url.search,
        key: 'query',
      },
    ];
  };

  render() {
    const {request, response, bodyFormat, onSelectFormat} = this.props;
    const url = new URL(request.url);

    const formattedText = bodyFormat == BodyOptions.formatted;

    return (
      <RequestDetails.Container>
        <Panel
          key="request"
          heading={'Request'}
          floating={false}
          padded={false}>
          <ManagedTable
            multiline={true}
            columnSizes={KeyValueColumnSizes}
            columns={KeyValueColumns}
            rows={this.urlColumns(url)}
            autoHeight={true}
            floating={false}
            zebra={false}
          />
        </Panel>

        {url.search ? (
          <Panel
            heading={'Request Query Parameters'}
            floating={false}
            padded={false}>
            <QueryInspector queryParams={url.searchParams} />
          </Panel>
        ) : null}

        {request.headers.length > 0 ? (
          <Panel
            key="headers"
            heading={'Request Headers'}
            floating={false}
            padded={false}>
            <HeaderInspector headers={request.headers} />
          </Panel>
        ) : null}

        {request.data != null ? (
          <Panel
            key="requestData"
            heading={'Request Body'}
            floating={false}
            padded={!formattedText}>
            <RequestBodyInspector
              formattedText={formattedText}
              request={request}
            />
          </Panel>
        ) : null}
        {response ? (
          <>
            {response.headers.length > 0 ? (
              <Panel
                key={'responseheaders'}
                heading={`Response Headers${
                  response.isMock ? ' (Mocked)' : ''
                }`}
                floating={false}
                padded={false}>
                <HeaderInspector headers={response.headers} />
              </Panel>
            ) : null}
            <Panel
              key={'responsebody'}
              heading={`Response Body${response.isMock ? ' (Mocked)' : ''}`}
              floating={false}
              padded={!formattedText}>
              <ResponseBodyInspector
                formattedText={formattedText}
                request={request}
                response={response}
              />
            </Panel>
          </>
        ) : null}
        <Panel
          key="options"
          heading={'Options'}
          floating={false}
          collapsed={true}>
          <Select
            grow
            label="Body"
            selected={bodyFormat}
            onChange={onSelectFormat}
            options={BodyOptions}
          />
        </Panel>
        {response && response.insights ? (
          <Panel
            key="insights"
            heading={'Insights'}
            floating={false}
            collapsed={true}>
            <InsightsInspector insights={response.insights} />
          </Panel>
        ) : null}
      </RequestDetails.Container>
    );
  }
}

class QueryInspector extends Component<{queryParams: URLSearchParams}> {
  render() {
    const {queryParams} = this.props;

    const rows: any = [];
    queryParams.forEach((value: string, key: string) => {
      rows.push({
        columns: {
          key: {
            value: <WrappingText>{key}</WrappingText>,
          },
          value: {
            value: <WrappingText>{value}</WrappingText>,
          },
        },
        copyText: value,
        key: key,
      });
    });

    return rows.length > 0 ? (
      <ManagedTable
        multiline={true}
        columnSizes={KeyValueColumnSizes}
        columns={KeyValueColumns}
        rows={rows}
        autoHeight={true}
        floating={false}
        zebra={false}
      />
    ) : null;
  }
}

type HeaderInspectorProps = {
  headers: Array<Header>;
};

type HeaderInspectorState = {
  computedHeaders: Object;
};

class HeaderInspector extends Component<
  HeaderInspectorProps,
  HeaderInspectorState
> {
  render() {
    const computedHeaders: Map<string, string> = this.props.headers.reduce(
      (sum, header) => {
        return sum.set(header.key, header.value);
      },
      new Map(),
    );

    const rows: any = [];
    computedHeaders.forEach((value: string, key: string) => {
      rows.push({
        columns: {
          key: {
            value: <WrappingText>{key}</WrappingText>,
          },
          value: {
            value: <WrappingText>{value}</WrappingText>,
          },
        },
        copyText: value,
        key,
      });
    });

    return rows.length > 0 ? (
      <ManagedTable
        multiline={true}
        columnSizes={KeyValueColumnSizes}
        columns={KeyValueColumns}
        rows={rows}
        autoHeight={true}
        floating={false}
        zebra={false}
      />
    ) : null;
  }
}

const BodyContainer = styled.div({
  paddingTop: 10,
  paddingBottom: 20,
});

type BodyFormatter = {
  formatRequest?: (request: Request) => any;
  formatResponse?: (request: Request, response: Response) => any;
};

class RequestBodyInspector extends Component<{
  request: Request;
  formattedText: boolean;
}> {
  render() {
    const {request, formattedText} = this.props;
    if (request.data == null || request.data.trim() === '') {
      return <Empty />;
    }
    const bodyFormatters = formattedText ? TextBodyFormatters : BodyFormatters;
    for (const formatter of bodyFormatters) {
      if (formatter.formatRequest) {
        try {
          const component = formatter.formatRequest(request);
          if (component) {
            return (
              <BodyContainer>
                {component}
                <FormattedBy>
                  Formatted by {formatter.constructor.name}
                </FormattedBy>
              </BodyContainer>
            );
          }
        } catch (e) {
          console.warn(
            'BodyFormatter exception from ' + formatter.constructor.name,
            e.message,
          );
        }
      }
    }
    return renderRawBody(request);
  }
}

class ResponseBodyInspector extends Component<{
  response: Response;
  request: Request;
  formattedText: boolean;
}> {
  render() {
    const {request, response, formattedText} = this.props;
    if (response.data == null || response.data.trim() === '') {
      return <Empty />;
    }
    const bodyFormatters = formattedText ? TextBodyFormatters : BodyFormatters;
    for (const formatter of bodyFormatters) {
      if (formatter.formatResponse) {
        try {
          const component = formatter.formatResponse(request, response);
          if (component) {
            return (
              <BodyContainer>
                {component}
                <FormattedBy>
                  Formatted by {formatter.constructor.name}
                </FormattedBy>
              </BodyContainer>
            );
          }
        } catch (e) {
          console.warn(
            'BodyFormatter exception from ' + formatter.constructor.name,
            e.message,
          );
        }
      }
    }
    return renderRawBody(response);
  }
}

const FormattedBy = styled(SmallText)({
  marginTop: 8,
  fontSize: '0.7em',
  textAlign: 'center',
  display: 'block',
});

const Empty = () => (
  <BodyContainer>
    <Text>(empty)</Text>
  </BodyContainer>
);

function renderRawBody(container: Request | Response) {
  const decoded = decodeBody(container);
  return (
    <BodyContainer>
      {decoded ? (
        <Text selectable wordWrap="break-word">
          {decoded}
        </Text>
      ) : (
        <>
          <FormattedBy>(Failed to decode)</FormattedBy>
          <Text selectable wordWrap="break-word">
            {container.data}
          </Text>
        </>
      )}
    </BodyContainer>
  );
}

const MediaContainer = styled(FlexColumn)({
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
});

type ImageWithSizeProps = {
  src: string;
};

type ImageWithSizeState = {
  width: number;
  height: number;
};

class ImageWithSize extends Component<ImageWithSizeProps, ImageWithSizeState> {
  static Image = styled.img({
    objectFit: 'scale-down',
    maxWidth: '100%',
    marginBottom: 10,
  });

  static Text = styled(Text)({
    color: colors.dark70,
    fontSize: 14,
  });

  constructor(props: ImageWithSizeProps, context: any) {
    super(props, context);
    this.state = {
      width: 0,
      height: 0,
    };
  }

  componentDidMount() {
    const image = new Image();
    image.src = this.props.src;
    image.onload = () => {
      image.width;
      image.height;
      this.setState({
        width: image.width,
        height: image.height,
      });
    };
  }

  render() {
    return (
      <MediaContainer>
        <ImageWithSize.Image src={this.props.src} />
        <ImageWithSize.Text>
          {this.state.width} x {this.state.height}
        </ImageWithSize.Text>
      </MediaContainer>
    );
  }
}

class ImageFormatter {
  formatResponse = (request: Request, response: Response) => {
    if (getHeaderValue(response.headers, 'content-type').startsWith('image/')) {
      if (response.data) {
        const src = `data:${getHeaderValue(
          response.headers,
          'content-type',
        )};base64,${response.data}`;
        return <ImageWithSize src={src} />;
      } else {
        // fallback to using the request url
        return <ImageWithSize src={request.url} />;
      }
    }
  };
}

class VideoFormatter {
  static Video = styled.video({
    maxWidth: 500,
    maxHeight: 500,
  });

  formatResponse = (request: Request, response: Response) => {
    const contentType = getHeaderValue(response.headers, 'content-type');
    if (contentType.startsWith('video/')) {
      return (
        <MediaContainer>
          <VideoFormatter.Video controls={true}>
            <source src={request.url} type={contentType} />
          </VideoFormatter.Video>
        </MediaContainer>
      );
    }
  };
}

class JSONText extends Component<{children: any}> {
  static NoScrollbarText = styled(Text)({
    overflowY: 'hidden',
  });

  render() {
    const jsonObject = this.props.children;
    return (
      <JSONText.NoScrollbarText code whiteSpace="pre" selectable>
        {JSON.stringify(jsonObject, null, 2)}
        {'\n'}
      </JSONText.NoScrollbarText>
    );
  }
}

class XMLText extends Component<{body: any}> {
  static NoScrollbarText = styled(Text)({
    overflowY: 'hidden',
  });

  render() {
    const xmlPretty = xmlBeautifier(this.props.body);
    return (
      <XMLText.NoScrollbarText code whiteSpace="pre" selectable>
        {xmlPretty}
        {'\n'}
      </XMLText.NoScrollbarText>
    );
  }
}

class JSONTextFormatter {
  formatRequest = (request: Request) => {
    return this.format(
      decodeBody(request),
      getHeaderValue(request.headers, 'content-type'),
    );
  };

  formatResponse = (_request: Request, response: Response) => {
    return this.format(
      decodeBody(response),
      getHeaderValue(response.headers, 'content-type'),
    );
  };

  format = (body: string, contentType: string) => {
    if (
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/hal+json') ||
      contentType.startsWith('text/javascript') ||
      contentType.startsWith('application/x-fb-flatbuffer')
    ) {
      try {
        const data = JSON.parse(body);
        return <JSONText>{data}</JSONText>;
      } catch (SyntaxError) {
        // Multiple top level JSON roots, map them one by one
        return body
          .split('\n')
          .map((json) => JSON.parse(json))
          .map((data) => <JSONText>{data}</JSONText>);
      }
    }
  };
}

class XMLTextFormatter {
  formatRequest = (request: Request) => {
    return this.format(
      decodeBody(request),
      getHeaderValue(request.headers, 'content-type'),
    );
  };

  formatResponse = (_request: Request, response: Response) => {
    return this.format(
      decodeBody(response),
      getHeaderValue(response.headers, 'content-type'),
    );
  };

  format = (body: string, contentType: string) => {
    if (contentType.startsWith('text/html')) {
      return <XMLText body={body} />;
    }
  };
}

class JSONFormatter {
  formatRequest = (request: Request) => {
    return this.format(
      decodeBody(request),
      getHeaderValue(request.headers, 'content-type'),
    );
  };

  formatResponse = (_request: Request, response: Response) => {
    return this.format(
      decodeBody(response),
      getHeaderValue(response.headers, 'content-type'),
    );
  };

  format = (body: string, contentType: string) => {
    if (
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/hal+json') ||
      contentType.startsWith('text/javascript') ||
      contentType.startsWith('application/x-fb-flatbuffer')
    ) {
      try {
        const data = JSON.parse(body);
        return (
          <ManagedDataInspector
            collapsed={true}
            expandRoot={true}
            data={data}
          />
        );
      } catch (SyntaxError) {
        // Multiple top level JSON roots, map them one by one
        const roots = body.split('\n');
        return (
          <ManagedDataInspector
            collapsed={true}
            expandRoot={true}
            data={roots.map((json) => JSON.parse(json))}
          />
        );
      }
    }
  };
}

class LogEventFormatter {
  formatRequest = (request: Request) => {
    if (request.url.indexOf('logging_client_event') > 0) {
      const data = querystring.parse(decodeBody(request));
      if (typeof data.message === 'string') {
        data.message = JSON.parse(data.message);
      }
      return <ManagedDataInspector expandRoot={true} data={data} />;
    }
  };
}

class GraphQLBatchFormatter {
  formatRequest = (request: Request) => {
    if (request.url.indexOf('graphqlbatch') > 0) {
      const data = querystring.parse(decodeBody(request));
      if (typeof data.queries === 'string') {
        data.queries = JSON.parse(data.queries);
      }
      return <ManagedDataInspector expandRoot={true} data={data} />;
    }
  };
}

class GraphQLFormatter {
  parsedServerTimeForFirstFlush = (data: any) => {
    const firstResponse =
      Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (!firstResponse) {
      return null;
    }

    const extensions = firstResponse['extensions'];
    if (!extensions) {
      return null;
    }
    const serverMetadata = extensions['server_metadata'];
    if (!serverMetadata) {
      return null;
    }
    const requestStartMs = serverMetadata['request_start_time_ms'];
    const timeAtFlushMs = serverMetadata['time_at_flush_ms'];
    return (
      <WrappingText>
        {'Server wall time for initial response (ms): ' +
          (timeAtFlushMs - requestStartMs)}
      </WrappingText>
    );
  };
  formatRequest = (request: Request) => {
    if (request.url.indexOf('graphql') > 0) {
      const decoded = decodeBody(request);
      if (!decoded) {
        return undefined;
      }
      const data = querystring.parse(decoded);
      if (typeof data.variables === 'string') {
        data.variables = JSON.parse(data.variables);
      }
      if (typeof data.query_params === 'string') {
        data.query_params = JSON.parse(data.query_params);
      }
      return <ManagedDataInspector expandRoot={true} data={data} />;
    }
  };

  formatResponse = (_request: Request, response: Response) => {
    return this.format(
      decodeBody(response),
      getHeaderValue(response.headers, 'content-type'),
    );
  };

  format = (body: string, contentType: string) => {
    if (
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/hal+json') ||
      contentType.startsWith('text/javascript') ||
      contentType.startsWith('text/html') ||
      contentType.startsWith('application/x-fb-flatbuffer')
    ) {
      try {
        const data = JSON.parse(body);
        return (
          <div>
            {this.parsedServerTimeForFirstFlush(data)}
            <ManagedDataInspector
              collapsed={true}
              expandRoot={true}
              data={data}
            />
          </div>
        );
      } catch (SyntaxError) {
        // Multiple top level JSON roots, map them one by one
        const parsedResponses = body
          .replace(/}{/g, '}\r\n{')
          .split('\n')
          .map((json) => JSON.parse(json));
        return (
          <div>
            {this.parsedServerTimeForFirstFlush(parsedResponses)}
            <ManagedDataInspector
              collapsed={true}
              expandRoot={true}
              data={parsedResponses}
            />
          </div>
        );
      }
    }
  };
}

class FormUrlencodedFormatter {
  formatRequest = (request: Request) => {
    const contentType = getHeaderValue(request.headers, 'content-type');
    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      const decoded = decodeBody(request);
      if (!decoded) {
        return undefined;
      }
      return (
        <ManagedDataInspector
          expandRoot={true}
          data={querystring.parse(decoded)}
        />
      );
    }
  };
}

class BinaryFormatter {
  formatRequest(request: Request) {
    return this.format(request);
  }

  formatResponse(_request: Request, response: Response) {
    return this.format(response);
  }

  format(container: Request | Response) {
    if (
      getHeaderValue(container.headers, 'content-type') ===
      'application/octet-stream'
    ) {
      return '(binary data)'; // we could offer a download button here?
    }
    return undefined;
  }
}

const BodyFormatters: Array<BodyFormatter> = [
  new ImageFormatter(),
  new VideoFormatter(),
  new LogEventFormatter(),
  new GraphQLBatchFormatter(),
  new GraphQLFormatter(),
  new JSONFormatter(),
  new FormUrlencodedFormatter(),
  new XMLTextFormatter(),
  new BinaryFormatter(),
];

const TextBodyFormatters: Array<BodyFormatter> = [new JSONTextFormatter()];

class InsightsInspector extends Component<{insights: Insights}> {
  formatTime(value: number): string {
    return `${value} ms`;
  }

  formatSpeed(value: number): string {
    return `${formatBytes(value)}/sec`;
  }

  formatRetries(retry: RetryInsights): string {
    const timesWord = retry.limit === 1 ? 'time' : 'times';

    return `${this.formatTime(retry.timeSpent)} (${
      retry.count
    } ${timesWord} out of ${retry.limit})`;
  }

  buildRow<T>(
    name: string,
    value: T | null | undefined,
    formatter: (value: T) => string,
  ): any {
    return value
      ? {
          columns: {
            key: {
              value: <WrappingText>{name}</WrappingText>,
            },
            value: {
              value: <WrappingText>{formatter(value)}</WrappingText>,
            },
          },
          copyText: () => `${name}: ${formatter(value)}`,
          key: name,
        }
      : null;
  }

  render() {
    const insights = this.props.insights;
    const {buildRow, formatTime, formatSpeed, formatRetries} = this;

    const rows = [
      buildRow('Retries', insights.retries, formatRetries.bind(this)),
      buildRow('DNS lookup time', insights.dnsLookupTime, formatTime),
      buildRow('Connect time', insights.connectTime, formatTime),
      buildRow('SSL handshake time', insights.sslHandshakeTime, formatTime),
      buildRow('Pretransfer time', insights.preTransferTime, formatTime),
      buildRow('Redirect time', insights.redirectsTime, formatTime),
      buildRow('First byte wait time', insights.timeToFirstByte, formatTime),
      buildRow('Data transfer time', insights.transferTime, formatTime),
      buildRow('Post processing time', insights.postProcessingTime, formatTime),
      buildRow('Bytes transfered', insights.bytesTransfered, formatBytes),
      buildRow('Transfer speed', insights.transferSpeed, formatSpeed),
    ].filter((r) => r != null);

    return rows.length > 0 ? (
      <ManagedTable
        multiline={true}
        columnSizes={KeyValueColumnSizes}
        columns={KeyValueColumns}
        rows={rows}
        autoHeight={true}
        floating={false}
        zebra={false}
      />
    ) : null;
  }
}

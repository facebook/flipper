/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// $FlowFixMe
import pako from 'pako';
import type {Request, Response, Header} from './index.js';

import {
  Component,
  FlexColumn,
  ManagedTable,
  ManagedDataInspector,
  Text,
  Panel,
  styled,
  colors,
} from 'sonar';
import {getHeaderValue} from './index.js';

import querystring from 'querystring';

const WrappingText = Text.extends({
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
  request: Request,
  response: ?Response,
};

function decodeBody(container: Request | Response): string {
  if (!container.data) {
    return '';
  }
  const b64Decoded = atob(container.data);
  const encodingHeader = container.headers.find(
    header => header.key === 'Content-Encoding',
  );

  return encodingHeader && encodingHeader.value === 'gzip'
    ? decompress(b64Decoded)
    : b64Decoded;
}

function decompress(body: string): string {
  const charArray = body.split('').map(x => x.charCodeAt(0));

  const byteArray = new Uint8Array(charArray);

  let data;
  try {
    if (body) {
      data = pako.inflate(byteArray);
    } else {
      return body;
    }
  } catch (e) {
    // Sometimes Content-Encoding is 'gzip' but the body is already decompressed.
    // Assume this is the case when decompression fails.
    return body;
  }

  return String.fromCharCode.apply(null, new Uint8Array(data));
}

export default class RequestDetails extends Component<RequestDetailsProps> {
  static Container = FlexColumn.extends({
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
    const {request, response} = this.props;
    const url = new URL(request.url);

    return (
      <RequestDetails.Container>
        <Panel heading={'Request'} floating={false} padded={false}>
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
          <Panel heading={'Request Headers'} floating={false} padded={false}>
            <HeaderInspector headers={request.headers} />
          </Panel>
        ) : null}

        {request.data != null ? (
          <Panel heading={'Request Body'} floating={false}>
            <RequestBodyInspector request={request} />
          </Panel>
        ) : null}

        {response
          ? [
              response.headers.length > 0 ? (
                <Panel
                  heading={'Response Headers'}
                  floating={false}
                  padded={false}>
                  <HeaderInspector headers={response.headers} />
                </Panel>
              ) : null,
              <Panel heading={'Response Body'} floating={false}>
                <ResponseBodyInspector request={request} response={response} />
              </Panel>,
            ]
          : null}
      </RequestDetails.Container>
    );
  }
}

class QueryInspector extends Component<{queryParams: URLSearchParams}> {
  render() {
    const {queryParams} = this.props;

    const rows = [];
    for (const kv of queryParams.entries()) {
      rows.push({
        columns: {
          key: {
            value: <WrappingText>{kv[0]}</WrappingText>,
          },
          value: {
            value: <WrappingText>{kv[1]}</WrappingText>,
          },
        },
        copyText: kv[1],
        key: kv[0],
      });
    }

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
  headers: Array<Header>,
};

type HeaderInspectorState = {
  computedHeaders: Object,
};

class HeaderInspector extends Component<
  HeaderInspectorProps,
  HeaderInspectorState,
> {
  render() {
    const computedHeaders = this.props.headers.reduce((sum, header) => {
      return {...sum, [header.key]: header.value};
    }, {});

    const rows = [];
    for (const key in computedHeaders) {
      rows.push({
        columns: {
          key: {
            value: <WrappingText>{key}</WrappingText>,
          },
          value: {
            value: <WrappingText>{computedHeaders[key]}</WrappingText>,
          },
        },
        copyText: computedHeaders[key],
        key,
      });
    }

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

const BodyContainer = styled.view({
  paddingTop: 10,
  paddingBottom: 20,
});

type BodyFormatter = {
  formatRequest?: (request: Request) => any,
  formatResponse?: (request: Request, response: Response) => any,
};

class RequestBodyInspector extends Component<{
  request: Request,
}> {
  render() {
    const {request} = this.props;
    let component;
    try {
      for (const formatter of BodyFormatters) {
        if (formatter.formatRequest) {
          component = formatter.formatRequest(request);
          if (component) {
            break;
          }
        }
      }
    } catch (e) {}

    if (component == null && request.data != null) {
      component = <Text>{decodeBody(request)}</Text>;
    }

    if (component == null) {
      return null;
    }

    return <BodyContainer>{component}</BodyContainer>;
  }
}

class ResponseBodyInspector extends Component<{
  response: Response,
  request: Request,
}> {
  render() {
    const {request, response} = this.props;

    let component;
    try {
      for (const formatter of BodyFormatters) {
        if (formatter.formatResponse) {
          component = formatter.formatResponse(request, response);
          if (component) {
            break;
          }
        }
      }
    } catch (e) {}

    component = component || <Text>{decodeBody(response)}</Text>;

    return <BodyContainer>{component}</BodyContainer>;
  }
}

const MediaContainer = FlexColumn.extends({
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
});

type ImageWithSizeProps = {
  src: string,
};

type ImageWithSizeState = {
  width: number,
  height: number,
};

class ImageWithSize extends Component<ImageWithSizeProps, ImageWithSizeState> {
  static Image = styled.image({
    objectFit: 'scale-down',
    maxWidth: 500,
    maxHeight: 500,
    marginBottom: 10,
  });

  static Text = Text.extends({
    color: colors.dark70,
    fontSize: 14,
  });

  constructor(props, context) {
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
    if (getHeaderValue(response.headers, 'content-type').startsWith('image')) {
      return <ImageWithSize src={request.url} />;
    }
  };
}

class VideoFormatter {
  static Video = styled.customHTMLTag('video', {
    maxWidth: 500,
    maxHeight: 500,
  });

  formatResponse = (request: Request, response: Response) => {
    const contentType = getHeaderValue(response.headers, 'content-type');
    if (contentType.startsWith('video')) {
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

class JSONFormatter {
  formatRequest = (request: Request) => {
    return this.format(
      decodeBody(request),
      getHeaderValue(request.headers, 'content-type'),
    );
  };

  formatResponse = (request: Request, response: Response) => {
    return this.format(
      decodeBody(response),
      getHeaderValue(response.headers, 'content-type'),
    );
  };

  format = (body: string, contentType: string) => {
    if (
      contentType.startsWith('application/json') ||
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
            data={roots.map(json => JSON.parse(json))}
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
      if (data.message) {
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
      if (data.queries) {
        data.queries = JSON.parse(data.queries);
      }
      return <ManagedDataInspector expandRoot={true} data={data} />;
    }
  };
}

class GraphQLFormatter {
  formatRequest = (request: Request) => {
    if (request.url.indexOf('graphql') > 0) {
      const data = querystring.parse(decodeBody(request));
      if (data.variables) {
        data.variables = JSON.parse(data.variables);
      }
      if (data.query_params) {
        data.query_params = JSON.parse(data.query_params);
      }
      return <ManagedDataInspector expandRoot={true} data={data} />;
    }
  };
}

class FormUrlencodedFormatter {
  formatRequest = (request: Request) => {
    const contentType = getHeaderValue(request.headers, 'content-type');
    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      return (
        <ManagedDataInspector
          expandRoot={true}
          data={querystring.parse(decodeBody(request))}
        />
      );
    }
  };
}

const BodyFormatters: Array<BodyFormatter> = [
  new ImageFormatter(),
  new VideoFormatter(),
  new LogEventFormatter(),
  new GraphQLBatchFormatter(),
  new GraphQLFormatter(),
  new JSONFormatter(),
  new FormUrlencodedFormatter(),
];

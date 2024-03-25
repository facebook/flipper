/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperConnection} from './connection';
import {FlipperRequest, FlipperResponse} from './message';
import {FlipperPlugin} from './plugin';
import {FlipperResponder} from './responder';
import {
  assert,
  detectDevice,
  detectOS,
  getDeviceId as getDeviceIdDefault,
} from './util';
import {RECONNECT_TIMEOUT} from './consts';

// TODO: Share with flipper-server-core
// Borrowed from https://github.com/strong-roots-capital/websocket-close-codes
/**
 * IANA WebSocket close code definitions.
 *
 * @remarks
 * https://www.iana.org/assignments/websocket/websocket.xml#close-code-number
 */
export enum WSCloseCode {
  /**
   * Normal closure; the connection successfully completed whatever
   * purpose for which it was created.
   */
  NormalClosure = 1000,
  /**
   * The endpoint is going away, either because of a server failure
   * or because the browser is navigating away from the page that
   * opened the connection.
   */
  GoingAway = 1001,
  /**
   * The endpoint is terminating the connection due to a protocol
   * error.
   */
  ProtocolError = 1002,
  /**
   * The connection is being terminated because the endpoint
   * received data of a type it cannot accept (for example, a
   * text-only endpoint received binary data).
   */
  UnsupportedData = 1003,
  /**
   * (Reserved.)  Indicates that no status code was provided even
   * though one was expected.
   */
  NoStatusRecvd = 1005,
  /**
   * (Reserved.) Used to indicate that a connection was closed
   * abnormally (that is, with no close frame being sent) when a
   * status code is expected.
   */
  AbnormalClosure = 1006,
  /**
   * The endpoint is terminating the connection because a message
   * was received that contained inconsistent data (e.g., non-UTF-8
   * data within a text message).
   */
  InvalidFramePayloadData = 1007,
  /**
   * The endpoint is terminating the connection because it received
   * a message that violates its policy. This is a generic status
   * code, used when codes 1003 and 1009 are not suitable.
   */
  PolicyViolation = 1008,
  /**
   * The endpoint is terminating the connection because a data frame
   * was received that is too large.
   */
  MessageTooBig = 1009,
  /**
   * The client is terminating the connection because it expected
   * the server to negotiate one or more extension, but the server
   * didn't.
   */
  MissingExtension = 1010,
  /**
   * The server is terminating the connection because it encountered
   * an unexpected condition that prevented it from fulfilling the
   * request.
   */
  InternalError = 1011,
  /**
   * The server is terminating the connection because it is
   * restarting. [Ref]
   */
  ServiceRestart = 1012,
  /**
   * The server is terminating the connection due to a temporary
   * condition, e.g. it is overloaded and is casting off some of its
   * clients.
   */
  TryAgainLater = 1013,
  /**
   * The server was acting as a gateway or proxy and received an
   * invalid response from the upstream server. This is similar to
   * 502 HTTP Status Code.
   */
  BadGateway = 1014,
  /**
   * (Reserved.) Indicates that the connection was closed due to a
   * failure to perform a TLS handshake (e.g., the server
   * certificate can't be verified).
   */
  TLSHandshake = 1015,
}

// global.WebSocket interface is not 100% compatible with ws.WebSocket interface
// We need to support both, so defining our own with only required props
export interface FlipperWebSocket {
  onclose:
    | ((ev: {code: WSCloseCode}) => void)
    | ((ev: {detail?: {code: WSCloseCode}}) => void)
    | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage:
    | ((ev: {data: Buffer | ArrayBuffer | Buffer[] | string}) => void)
    | null;
  onopen: (() => void) | null;
  close(code?: number): void;
  send(data: string): void;
  readyState: number;
}

interface FlipperClientOptions {
  // Make the client connect to a different URL
  urlBase?: string;
  // Override WebSocket implementation (Node.js folks, it is for you!)
  websocketFactory?: (url: string) => FlipperWebSocket;
  // Override how errors are handled (it is simple `console.error` by default)
  onError?: (e: unknown) => void;
  // Timeout after which client tries to reconnect to Flipper
  reconnectTimeout?: number;
  // Set device ID. Default: random ID persisted to local storage.
  getDeviceId?: () => Promise<string> | string;
}

export class FlipperClient {
  private readonly plugins: Map<string, FlipperPlugin> = new Map();
  private readonly connections: Map<string, FlipperConnection> = new Map();
  private ws?: FlipperWebSocket;
  private deviceId!: string;
  private readonly os = detectOS();
  private readonly device = detectDevice();
  private reconnectionTimer?: NodeJS.Timeout;
  private resolveStartPromise?: () => void;
  private urlBase!: string;
  private websocketFactory!: (url: string) => FlipperWebSocket;
  private onError!: (e: unknown) => void;
  private reconnectTimeout!: number;
  private appName!: string;

  constructor() {}

  addPlugin(plugin: FlipperPlugin) {
    this.plugins.set(plugin.getId(), plugin);

    if (this.isConnected) {
      this.refreshPlugins();
    }
  }

  getPlugin(id: string): FlipperPlugin | undefined {
    return this.plugins.get(id);
  }

  async start(
    appName: string,
    {
      urlBase = 'localhost:8333',
      websocketFactory = (url) => new WebSocket(url) as FlipperWebSocket,
      onError = (e) => console.error('WebSocket error', e),
      reconnectTimeout = RECONNECT_TIMEOUT,
      getDeviceId = getDeviceIdDefault,
    }: FlipperClientOptions = {},
  ): Promise<void> {
    if (this.ws) {
      return;
    }

    this.deviceId = await getDeviceId();
    this.appName = appName;
    this.onError = onError;
    this.urlBase = urlBase;
    this.websocketFactory = websocketFactory;
    this.reconnectTimeout = reconnectTimeout;

    return new Promise<void>((resolve) => {
      this.resolveStartPromise = resolve;
      this.connectToFlipper();
    });
  }

  stop() {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = undefined;
    }

    if (!this.ws) {
      return;
    }

    // TODO: Why is it not 1000 by default?
    this.ws.close(WSCloseCode.NormalClosure);
    this.ws = undefined;
    for (const plugin of this.plugins.values()) {
      this.disconnectPlugin(plugin);
    }
  }

  sendData(payload: FlipperRequest | FlipperResponse) {
    assert(this.ws);
    this.ws.send(JSON.stringify(payload));
  }

  get isConnected() {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState#value
    return !!this.ws && this.ws.readyState === 1;
  }

  private connectToFlipper() {
    const url = `ws://${this.urlBase}?device_id=${this.device}${this.deviceId}&device=${this.device}&app=${this.appName}&os=${this.os}`;
    const encodedUrl = encodeURI(url);

    this.ws = this.websocketFactory(encodedUrl);

    this.ws.onerror = (error) => {
      this.onError(error);
    };
    this.ws.onclose = (ev: {
      code: WSCloseCode;
      detail?: {code: WSCloseCode};
    }) => {
      const code = ev.code || ev.detail?.code;
      // Some WS implementations do not properly set `wasClean`
      if (![WSCloseCode.NormalClosure, WSCloseCode.GoingAway].includes(code)) {
        this.reconnect();
      }
    };

    this.ws.onopen = () => {
      assert(this.ws);

      this.resolveStartPromise?.();
      this.resolveStartPromise = undefined;

      this.ws.onmessage = ({data}) => {
        try {
          const message = JSON.parse(data.toString());
          this.onMessageReceived(message);
        } catch (error) {
          this.onError(error);
          assert(this.ws);
          this.ws.close(WSCloseCode.InternalError);
        }
      };
    };
  }

  // TODO: Reconnect in a loop with an exponential backoff
  private reconnect() {
    this.ws = undefined;

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = undefined;
    }

    this.reconnectionTimer = setTimeout(() => {
      this.connectToFlipper();
    }, this.reconnectTimeout);
  }

  private onMessageReceived(message: {
    method: string;
    id: number;
    params: any;
  }) {
    let responder: FlipperResponder | undefined;
    try {
      const {method, params, id} = message;
      responder = new FlipperResponder(id, this);

      if (method === 'getPlugins') {
        responder.success({plugins: [...this.plugins.keys()]});
        return;
      }

      if (method === 'getBackgroundPlugins') {
        responder.success({
          plugins: [...this.plugins.keys()].filter(
            (key) => this.plugins.get(key)?.runInBackground?.(),
          ),
        });
        return;
      }

      if (method === 'init') {
        const identifier = params['plugin'] as string;
        const plugin = this.plugins.get(identifier);
        if (plugin == null) {
          const errorMessage = `Plugin ${identifier} not found for method ${method}`;
          responder.error({message: errorMessage, name: 'PluginNotFound'});
          return;
        }

        this.connectPlugin(plugin);
        return;
      }

      if (method === 'deinit') {
        const identifier = params['plugin'] as string;
        const plugin = this.plugins.get(identifier);
        if (plugin == null) {
          const errorMessage = `Plugin ${identifier} not found for method ${method}`;
          responder.error({message: errorMessage, name: 'PluginNotFound'});
          return;
        }

        this.disconnectPlugin(plugin);
        return;
      }

      if (method === 'execute') {
        const identifier = params['api'] as string;
        const connection = this.connections.get(identifier);
        if (connection == null) {
          const errorMessage = `Connection ${identifier} not found for plugin identifier`;

          responder.error({message: errorMessage, name: 'ConnectionNotFound'});
          return;
        }

        connection.call(
          params['method'] as string,
          params['params'],
          responder,
        );
        return;
      }

      if (method == 'isMethodSupported') {
        const identifier = params['api'] as string;
        const method = params['method'] as string;
        const connection = this.connections.get(identifier);
        if (connection == null) {
          const errorMessage = `Connection ${identifier} not found for plugin identifier`;
          responder.error({message: errorMessage, name: 'ConnectionNotFound'});
          return;
        }
        responder.success({isSupported: connection.hasReceiver(method)});
        return;
      }

      const response = {message: 'Received unknown method: ' + method};
      responder.error(response);
    } catch (e) {
      if (responder) {
        responder.error({
          message: 'Unknown error during ' + JSON.stringify(message),
          name: 'Unknown',
        });
      }
      throw e;
    }
  }

  private refreshPlugins() {
    this.sendData({method: 'refreshPlugins'});
  }

  private connectPlugin(plugin: FlipperPlugin): void {
    const id = plugin.getId();
    const connection = new FlipperConnection(id, this);
    plugin.onConnect(connection);
    this.connections.set(id, connection);
  }

  private disconnectPlugin(plugin: FlipperPlugin): void {
    const id = plugin.getId();
    if (this.connections.has(id)) {
      plugin.onDisconnect();
      this.connections.delete(id);
    }
  }
}

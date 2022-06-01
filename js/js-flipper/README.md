# js-flipper

This package exposes JavaScript bindings to talk from web / Node.js directly to
flipper.

## Installation

`yarn add js-flipper`

## Usage

How to build Flipper plugins is explained in the flipper documentation:
[Creating a Flipper plugin](https://fbflipper.com/docs/extending/index).
Building a Flipper plugin involves building a plugin for the Desktop app, and a
plugin that runs on a Device (web or Node.js). This package is only needed for
the plugin that runs on the device (web / Node.js), and wants to use the
WebSocket connection to communicate to Flipper.

This package exposes a `flipperClient`. It has:

- `addPlugin` method. It accepts a `plugin`
parameter, that registers a client plugin and will fire the relevant callbacks
if the corresponding desktop plugin is selected in the Flipper Desktop. The full
plugin API is documented
[here](https://fbflipper.com/docs/extending/create-plugin).
- `start` method. It starts the client. It has two arguments:
   - `appName` - (required) the name displayed in Flipper
   - `options` which conforms to the interface
      ```ts
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
        getDeviceId?: () => Promise<string> | string
      }
      ```

## Example (web)

An example plugin can be found in
[FlipperTicTacToe.js](https://github.com/facebook/flipper/blob/main/js/react-flipper-example/src/FlipperTicTacToe.tsx).

The corresponding Desktop plugin ships by default in Flipper, so importing the
above file and dropping the `<FlipperTicTacToe />` component somewhere in your
application should work out of the box.

The sources of the corresponding Desktop plugin can be found
[here](https://github.com/facebook/flipper/tree/main/desktop/plugins/rn-tic-tac-toe).

## Node.js

Node.js does not have a built-in WebSocket implementation. You need to install
any implementation of WebSockets for Node.js that is compatible with the
interface of the
[web version](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

```ts
import flipperClient from 'js-flipper';
// Say, you decided to go with 'ws'
// https://github.com/websockets/ws
import WebSocket from 'ws';

// Start the client and pass some options
// You might ask yourself why there is the second argument `{ origin: 'localhost:' }`
// Flipper Desktop verifies the `Origin` header for every WS connection. You need to set it to one of the whitelisted values (see `VALID_WEB_SOCKET_REQUEST_ORIGIN_PREFIXES`).
flipperClient.start('My cool nodejs app', { websocketFactory: url => new WebSocket(url, {origin: 'localhost:'}) });
```

An example plugin should be somewhat similar to
[what we have for React](https://github.com/facebook/flipper/blob/main/js/react-flipper-example/src/FlipperTicTacToe.tsx).
It is currently WIP (do not confuse with RIP!).

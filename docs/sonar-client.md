---
id: sonar-client
title: Building a SonarClient
sidebar_label: SonarClient
---

Sonar clients communicate with the Sonar desktop app using JSON RPC messages over a web socket connection.

## Establishing a connection

Start by connecting to the Sonar server running within the desktop app. Connecting to the server registers your application with Sonar and enables plugins to interact with it. As the Sonar desktop has a different lifecycle than your app and may connect and disconnect at any time it is important that you attempt to reconnect to the Sonar server until it accepts your connection.

```
ws://localhost:8088/sonar?os={OS}
                         &device={DEVICE}
                         &app={APP}
                         &foreground={FOREGROUND}
```

* **`OS`** The OS which the connecting is being established from. For example os=Android if your client is running on Android. This is usually hard coded into the SonarClient implementation. This string may be used by the Sonar desktop app to identify valid plugins as well as present in the UI to the user.
* **`DEVICE`** The name of the device running the application. The Sonar server / desktop app may use this to coalesce multiple connections originating from the save device or present the string in the UI to differentiate between connections to different clients. For example device=iPhone7.
* **`APP`** The name of the app running this client instance. For example app=Facebook when connecting to a running facebook app. OS + DEVICE + APP should together uniquely identify a connection.
* **`FOREGROUND`** A boolean indicating whether this connection was established with a foreground process. This is a hint to the Sonar desktop app of whether to re-focus on this connection or not. For example foreground=true. This parameter is recommended but optional.

## Responding to messages

Web sockets are not based on a synchronous request-response model typically associated with http requests. Therefor to model request-response behavior on top of web sockets we need to invent our own protocol on top of web sockets. This is easy enough. Every request has an `id` and the corresponding response has a matching `id` field. In addition to an `id` we also add a `method` and a `params` field to the request body to mimic a simple remote procedure call (RPC) protocol. Both the `id` and `params` objects are optional as they are in function declaration in many languages. A call within an `id` field does not expect a response, it is a void function, and a call without a `params` object does not have any arguments.

Here is an example request-response from Sonar where the Desktop app requests the list of available plugins. All messages are JSON formatted. Responses contain either a `success` object representing the return value of the RPC invocation or a `error` object indicating an error occurred.

```javascript
let request = {
  id: 1,
  method: 'getPlugins',
  params: {},
};

let response = {
  id: 1,
  success: {
    plugins: ['layout'],
  },
};
```

There are a few methods which have to be implemented by all `SonarClient` implementations.

### `getPlugins`

Return the available plugins as a list of identifiers. A plugin identifier is a string which is matched with the plugin identifier of desktop javascript plugins.

```javascript
let request = {
  "id": number,
  "method": "getPlugins",
}

let response = {
  "id": number,
  "success": {
    "plugins": Array<string>
  },
}
```

### `init`

Initialize a plugin. This should result in a onConnected call on the appropriate plugin. Plugins should by nature be lazy and should not be initialized up front as this may incur significant cost. The Sonar desktop client knows when a plugin is needed and should control when to initialize them.

```javascript
let request = {
  method: 'init',
  params: {
    plugin: string,
  },
};
```

### `deinit`

Opposite of init. A call to deinit is made when a plugin is no longer needed and should release any resources. Don't rely only on deinit to release plugin resources as Sonar may quit without having the chance to issue a deinit call. In those cases you should also rely on web socket disconnect callbacks. This call is mainly for allowing the desktop app to control the lifecycle of plugins.

```javascript
let request = {
  method: 'deinit',
  params: {
    plugin: string,
  },
};
```

### `execute`

This is the main call and how the Sonar desktop plugins and client plugins communicate. When a javascript desktop plugin issues a client request it will be wrapped in one of these execute calls. This execute indicates that the call should be redirected to a plugin.

* `request.params.api` is the plugin id.
* `request.params.method` is the method within the plugin to execute.
* `request.params.params` is an optional params object containing the parameters to the RPC invocation.

```javascript
let request = {
  "id": ?number,
  "method": "execute",
  "params": {
    "api": string,
    "method": string,
    "params": ?Object,
  },
}

let response = {
  "id": number,
  "success": ?Object,
  "error": ?Object,
}
```

## Testing

Testing is incredibly important when building core infrastructure. What following below is a pseudo code collection of tests we would expect any new `SonarClient` implementation to implement and correctly execute. To run tests we strongly encourage you to build a mock for the web socket to mock out the desktop side of the protocol and to not have any network dependencies in your test code.

```javascript
test("GetPlugins", {
  let socket = new WebSocketMock();
  let client = new SonarClient(socket);
  let plugin = {id: "test"};

  client.addPlugin(plugin);
  client.start();

  socket.onReceive({
    id: 1,
    method: "getPlugins",
  });

  assert(socket.sentMessages, contains({
    id: 1,
    success:{
      plugins: ["test"],
    },
  }));
});

test("InitDeinit", {
  let socket = new WebSocketMock();
  let client = new SonarClient(socket);
  let plugin = {id: "test", connected: false};

  client.addPlugin(plugin);
  client.start();

  assertFalse(plugin.connected);

  socket.onReceive({
    id: 1,
    method: "init",
    params: {
      plugin: "test",
    },
  });

  assertTrue(plugin.connected);

  socket.onReceive({
    id: 1,
    method: "deinit",
    params: {
      plugin: "test",
    },
  });

  assertFalse(plugin.connected);
});

test("Disconnect", {
  let socket = new WebSocketMock();
  let client = new SonarClient(socket);
  let plugin = {id: "test", connected: false};

  client.addPlugin(plugin);
  client.start();

  assertFalse(plugin.connected);

  socket.onReceive({
    id: 1,
    method: "init",
    params: {
      plugin: "test",
    },
  });

  assertTrue(plugin.connected);
  socket.disconnect();
  assertFalse(plugin.connected);
});

test("Execute", {
  let socket = new WebSocketMock();
  let client = new SonarClient(socket);
  let plugin = {
    id: "test",
    reverse: (params, responder) => {
      responder.success({word: params.word.reverse()});
    },
  };

  client.addPlugin(plugin);
  client.start();

  socket.onReceive({
    id: 1,
    method: "init",
    params: {
      plugin: "test",
    },
  });

  socket.onReceive({
    id: 1,
    method: "execute",
    params: {
      api: "test",
      method: "reverse",
      params: {
        word: "hello"
      },
    },
  });

  assert(socket.sentMessages, contains({
    id: 1,
    success:{
      word: "olleh",
    },
  }));
});
```

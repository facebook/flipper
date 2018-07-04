---
id: communicating
title: Device Communication
sidebar_label: Device Communication
---

To start communicating with a client your plugin must implement the init function. Once this function has been called the active client can also be accessed via `this.client`. This `id` of the plugin in JavaScript must match the native plugin `id` to allow for them to communicate.

```javascript
class extends SonarPlugin {
  static title = "MyPlugin";
  static id = 'MyPlugin';

  init() {
    // Setup subscriptions etc using this.client
  }
}
```

There are three main ways your desktop plugin can communicate with connected devices.

## Remote method calls

With remote method calls your plugin can call a method on the attached client. This is useful for querying information from the client that your plugin wants to display. The first parameter is the name of the client API and the second is the specific method on that API. Optionally a JSON object can be passed as an argument to the client.

```javascript
this.client.call('methodName', DATA).then(res => {
  // res contains client response
});
```

This function return as promise so that you can await a potential response from the client. If you are calling a method on the client but don't expect a response then you should instead opt for using the `send()` function.

```javascript
this.client.send('methodName', DATA);
```

## Subscriptions

A client is not only able to respond to method calls but also push data directly to the Sonar desktop app. With the subscribe API your plugin can subscribe to there pushes from the client. Pass the name of the method and the API it is part of as well as a callback function to start a subscription. Any time the client sends a push matching this method the callback will be called with any attached data as a javascript object.

```javascript
this.client.subscribe('methodName', data => {
  // data contains any payload sent by the client
});
```

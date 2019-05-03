---
id: js-plugin-api
title: JavaScript Plugin API
---

Provided a plugin is setup as defined in [JS Plugin Definiton](js-setup), the basic requirement of a Flipper plugin is that `index.js` exports a default class that extends `FlipperPlugin`.

`FlipperPlugin` is an extension of `React.Component` with extra Flipper-related functionality. This means to define the UI of your plugin, you just need to implement this React component.

Below is a reference of the APIs available to the `FlipperPlugin` class.

## Client

This object is provided for communicating with the client plugin, and is accessible using `this.client` inside `FlipperPlugin`. Methods called on it will be routed to the client plugin with the same identifier as the JS plugin.

### call
`client.call(method: string, params: Object): Promise<Object>`

Call a method on your client plugin implementation.

### subscribe
`client.subscribe(method: string, callback: (Object => void)): void`

Subscribe to messages sent proactively from the client plugin.

### supportsMethod
`client.supportsMethod(method: string): Promise<Boolean>`

Resolves to true if the client supports the specified method. Useful when adding functionality to existing plugins, when connectivity to older clients is still required. Also useful when client plugins are implemented on multitple platforms and don't all have feature parity.

### send (DEPRECATED)
`client.send(method, params): void`

Use call instead which allows error handling and tracking.

## Props

Since `FlipperClient` inherits from `React.Component` we've defined some props that are provided. The main ones are explained below. Consult the code for the full set.

### persistedState
As well as React state, a FlipperPlugin also has persisted state. This state is retained even when the plugin is not active, for example when the user is using a different plugin, or when a client is temporarily disconnected, however it is not persisted across restarts of Flipper (by default).

Like React state, it should **never** be modified directly. Instead, you should use the `setPersistedState` prop.

If using persisted state, make sure to set a **static** `defaultPersistedState` in your class, so that the state is correctly initialized.

`static defaultPersistedState = {myValue: 55};`

### setPersistedState
A callback for updating persisted state. Similar to React's `setState`, you can pass either a complete PersistedState or a partial one that will be merged with the current persisted state.

Persisted state can also be modified when a plugin is not active. See [Background Plugins](#background-plugins) for details.

### selectPlugin
A callback for deep-linking to another plugin. When called, Flipper will switch from the current active plugin to the one specified and include a payload to provide context for the receiving plugin.

### deepLinkPayload
When a plugin is activated through a deep-link, this prop will contain the payload, allowing the plugin to highlight some particular data, or perform an action for example. A good time to check for the deepLinkPayload is in the `componentDidMount` React callback.

### isArchivedDevice
Informs the plugin whether or not the client is archived, and therefore not currently connected.

## Background Plugins

Sometimes it's desirable for a plugin to be able to process incoming messages from the client even when inactive.

To do this, define a static `persistedStateReducer` function in the plugin class:
```
static persistedStateReducer(
    persistedState: PersistedState,
    method: string,
    data: Object
  ): PersistedState
```

The job of the `persistedStateReducer` is to merge incoming data into the state, so that next time the plugin is activated, the persisted state will be ready.

## Notifications

Plugins can publish system notifications to alert the user of something. This is particularly useful when the plugin isn't the current active plugin. All notifications are aggregated in Flipper's notifications pane, accessible from the sidebar.

A notification should provide actionable and high-signal information for important events the user is likely to take action on. Notifications are generated from the data in your persistedState. To trigger notifications you need to implement a static function `getActiveNotifications`. This function should return all currently active notifications. To invalidate a notification, you simply stop including it in the result.
```
static getActiveNotifications(
    persistedState: PersistedState
  ): Array<Notification>
```

When the user clicks on a notification, they will be sent back to your plugin with the [deepLinkPayload](#deeplinkpayload) equal to the notification's action.

## Type Parameters
`FlipperPlugin<S, A, P>` can optionally take the following type parameters. It is highly recommended you provide them to benefit from type safety, but you can pass `*` when not using these features.

**State**: Specifies the type of the FlipperPlugin state. A `FlipperPlugin` is a React component, and this is equivalent to the React state type parameter.

**Actions**: `FlipperPlugin` has an infrequently used dispatchAction mechanism allowing your plugin dispatch actions and reduce state in a redux-like manner. This specifies the type of actions that can be dispatched.

**PersistedState**: This specifies the type of the persisted state of the plugin.

---
id: writing-a-plugin
title: Writing a plugin in JavaScript
sidebar_label: Writing a plugin
---

Every plugin needs to be self-contained in its own folder. At the root-level of this folder we are expecting a `package.json` for your plugin and an `index.js` file which is the entry-point to your plugin. To learn more about the basic setup of a plugin, have a look at [JavaScript Setup](jssetup.md).


We expect this file to have a default export of type `FlipperPlugin`. A hello-world-plugin could look like this:

```js
import {FlipperPlugin} from 'flipper';

export default class extends FlipperPlugin {
  static title = 'My Plugin';
  static id = 'my-plugin';
  static icon = 'internet';

  render() {
    return 'hello world';
  }
}
```


## persistedState

React state will be gone once your plugin unmounts. Every time the user switches between plugins, the React state will be reset. This might be fine for UI state, but doesn't make sense for your plugin's data. To persist your data when switching between plugins, you can use our `persistedState`-API.

Flipper passes a prop with the current `persistedState` to your plugin. You can access it via `this.props.persistedState`. To changes values in the `persistedState` you call `this.setPersistedState({...})`. Our API works similar to React's state API. You can pass a partial state object to `setPersistedState` and it will be merged with the previous state. You can also define a `static defaultPersistedState` to populate it.

A common pattern for plugins is to receive data from the client and store this data in `persistedState`. To allow your plugin to receive this data, even when the UI is not visible, you can implement a  `static persistedStateReducer`. This reducer's job is to merge the current `persistedState` with the data received from the device. Flipper will call this method, even when your plugin is not visible and the next time your plugin is mounted, `persistedState` will already have the latest data.

```js
static defaultPersistedState = {
  myData: [],
}

static persistedStateReducer = (
  persistedState: PersistedState,
  method: string,
  newData: Object,
): PersistedState => {
  // Logic to merge current state with new data
  return {
    myData: [...persistedState.myData, newData],
  };
};
```

Have a look at the [network plugin](https://github.com/facebook/flipper/blob/14e38c087f099a5afed4d7a1e4b5713468eabb28/src/plugins/network/index.js#L122) to see this in action. To send data while your plugin is not active, you need to opt-in on the native side of your plugin. For more info around this, read the mobile [setup](create-plugin.md).

## Notifications

Plugins can publish notifications which are displayed in Flipper's notification panel and trigger system level notifications. This can be used by your plugin to make the user aware of something that happened inside the plugin, even when the user is not looking at the plugin right now. The network plugin uses this for failed network requests. All notifications are aggregated in Flipper's notifications pane, accessible from the sidebar.

A notification should provide actionable and high-signal information for important events the user is likely to take action on. Notifications are generated from the data in your `persistedState`. To trigger notifications you need to implement a static function called `getActiveNotifications`. This function returns an array of all currently active notifications. To invalidate a notification, you simply stop including this notification in the array you are returning.

```js
type Notification = {|
  id: string, // used to identify your notification and needs to be unique to your plugin
  title: string, // title shown in the system-level notification
  message: string, // detailed information about the event
  severity: 'warning' | 'error',
  timestamp?: number, // unix timestamp of when the event occurred
  category?: string, // used to group similar notifications (not shown to the user)
  action?: string, // passed to your plugin when navigating from a notification back to the plugin
|};

static getActiveNotifications = (
  persistedState: PersistedState,
): Array<Notification> => {
  return persistedState.myData.filter(d => d.error).map(d => {
    id: d.id,
    title: 'Something is rotten in the state of Denmark',
    message: d.errorMessage,
    severity: 'error',
  });
};
```

When the user clicks on a notification, it links back into your plugin. `this.props.deepLinkPayload` will be set to the string provided in the notification's `action`. This can be used to highlight the particular part of the data that triggered the notification. In many cases the `action` will be some sort of ID for your data. You can use React's `componentDidMount` to check if a `deepLinkPayload` is provided.

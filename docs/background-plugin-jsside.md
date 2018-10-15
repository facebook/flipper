---
id: background-plugin-jsside
title: Background Plugin Setup
sidebar_label: Background Plugin
---

A Flipper Plugin can run in the background too. With this capability, the plugin running in the background can send messages even when the plugin is not active (i.e. the user is using some other plugin in Flipper). To prepare a Flipper plugin for running in the background, its JavaScript side should implement `persistedStateReducer`.

`persistedStateReducer` will be called whenever the JavaScript side receives data from the client. It gets two arguments: one is the current Redux store of the plugin and the second is the data received from client. The function returns the state with which the plugin should get updated. For more info follow the [network plugin](https://github.com/facebook/flipper/blob/14e38c087f099a5afed4d7a1e4b5713468eabb28/src/plugins/network/index.js#L122)


```js
export default class extends FlipperPlugin {
  static persistedStateReducer = (
    persistedState: PersistedState,
    data: Data,
  ): PersistedState => {
    // Logic to merge current state with new data
  };
}
```

You will also have to make the plugin opt in to run in the background from native side too. For more info around this, read the mobile [setup](create-plugin.md).

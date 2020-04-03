---
id: debugging
title: Debugging
---

## Built-in Developer Tools

Flipper is built on Electron which itself is built on Chromium. This means we can debug Flipper using Chrome's developer tools. Flipper will also automatically install the React devtools extension allowing you to have better insight into what is going on in your plugin.

You can open the dev tools from the menu with `View` > `Toggle Developer Tools` or pressing ⌥⌘I on a Mac.

In addition to helping you with the JavaScript, the JS console will also display uncaught exceptions thrown from the client plugin in response to Flipper method calls.

## Google Chrome Developer Tools

As an alternative to using built-in Developer Tools you can also attach to the running Flipper instance from Google Chrome Developer Tools. Sometimes this is useful, because the version of Dev Tools in Google Chrome is more recent than the embedded one, and it is possible to easily install additional extensions if required.

To attach the running Flipper instance open new tab in Google Chrome, navigate to "http://localhost:9222" and choose "Flipper" in the opened list.

![Attach From Google Chrome](assets/debugging-from-google-chrome.png)

## Visual Studio Code

If you prefer to use the same editor for both coding and debugging, you can attach to the running Flipper instance for debugging right from Visual Studio Code. First of all, you need to install extension "Debugger for Chrome". Then, to start debugging, open folder `desktop` of Flipper repository in VSCode, execute `yarn start` in terminal to launch Flipper in development mode, select tab `Debug and Run`, and run task `Attach to Running Renderer`. By default this task is set as the first one, so you can just press `F5` to run it.

![Attach From Visual Studio Code](assets/debugging-from-vscode.png)

## Plugin missing

If a plugin you created is not showing up there might be two potential classes of problems: Either there is a problem on the mobile side or on the desktop side. Understanding where the problem is rooted helps debugging it.

Click on "Plugin now showing" in the sidebar and see if your plugin is listed here. If it is not listed, the desktop side of the plugin is not loaded. One of the main reasons for this is that the plugin could not be compiled, due to some errors. Try launching Flipper from the Terminal to see some additional logs: `/Applications/Flipper.app/Contents/MacOS/Flipper`.

A common error here is `Error: fsevents unavailable (this watcher can only be used on Darwin)`. This can be fixed by installing watchman (`brew install watchman`).

If the plugin is listed in the desktop app, but still is not showing up in the sidebar, the mobile app is not announcing the plugin. In this case, make sure, to instantiate your plugin and add it to your FlipperClient.

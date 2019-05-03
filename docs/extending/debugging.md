---
id: debugging
title: Debugging
---

Flipper is built on Electron which itself is built on Chromium. This means we can debug Flipper using Chrome's developer tools. Flipper will also automatically install the React devtools extension allowing you to have better insight into what is going on in your plugin.

You can open the dev tools from the menu with `View` > `Toggle Developer Tools` or pressing ⌥⌘I on a Mac.

In addition to helping you with the JavaScript, the JS console will also display uncaught exceptions thrown from the client plugin in response to Flipper method calls.

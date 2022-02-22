---
title: Flipper is coming to your web and Node.js apps
author: Andrey Goncharov
author_title: Software Engineer
author_url: https://github.com/aigoncharov
author_image_url: https://avatars.githubusercontent.com/u/12794628?v=4
tags: [flipper, web, react, node.js]
description:
  Flipper now provides an official JavaScript client. We will see what
  `js-flipper` is, go over Flipper communication protocol, talk about what it
  takes to build a new Flipper client.
image: /img/js-flipper.jpg
hide_table_of_contents: false
---

![Cover image](/img/js-flipper.jpg)

For quite some time already, Flipper has secretly provided an experimental
JavaScript SDK to support connections from browsers and Node.js under the name
of `flipper-js-client-sdk`. With the ongoing migration of all our clients to
WebSockets, we have committed to providing an official documented SDK for
JavaScript clients. Without further ado, welcome
[js-flipper](https://www.npmjs.com/package/js-flipper)!

In this post we will:

- See what `js-flipper` is
- Get acquainted with how to build a Flipper plugin for a React app
- Learn how Flipper talks to a mobile device
- Dive deeper into the message structure
- Glance at what it takes to support a new platform

<!--truncate-->

## What `js-flipper` is and why it matters

Flipper supports native iOS, native Android apps and React Native apps out of
the box. Now with `js-flipper`, Flipper also supports JavaScript apps. Any
JavaScript app, whether they run in your browser or on your Node.js server, can
now connect to Flipper for a debugging session.

`js-flipper` is a new NPM package that exposes a Flipper client to your
JavaScript apps. Any Flipper client, in its turn, is a set of abstractions that
let your device connect and talk to Flipper. Long story short, `js-flipper`
allows you to easily write Flipper plugins for your web and Node.js apps.

> [Here](https://fbflipper.com/docs/tutorial/javascript/) is how you can write
> your first simple plugin.

Why does it matter?

It's a huge deal for two reasons:

1. Flipper at its core is just a device discovery service with a message bus.
   Its power comes from the plugins and the ecosystem.
2. It brings us one step closer to our goal of running Flipper everywhere. Bring
   Flipper to your microwave! On a serious note, more platforms -> bigger
   community -> more developers -> more plugins -> better Flipper for everyone.

Let's take a quick look at the principal architecture of Flipper:

![Flipper architecture](/img/flipper-arch.svg)

Here is what happens there:

1. Flipper constantly polls
   [ADB](https://developer.android.com/studio/command-line/adb) for available
   Android devices and [IDB](https://fbidb.io/) for available iOS devices.
2. If the device is running an app with an enabled Flipper client, the client
   tries to connect to Flipper on your laptop. It lets Flipper know that there
   is an app that it can talk to. Flipper and app chit-chat a bit negotiating
   the security and the list of supported plugins.
3. The developer picks one of the connected apps / devices. Say, it's the app.
4. The developer clicks one of the available plugins.
5. The plugin starts talking to the app on the device via the message bus
   exposed by Flipper. The plugin asks for necessary data from the app and shows
   it in a pretty UI.

At Meta, we have many active plugins, across a wide variety of devices, not just
phones, but also Quests, desktop applications, etc. At its core, Flipper is
data-agnostic and connect data flows to plugin displays. All Flipper core (we
call it Flipper Server) knows is what devices and Flipper-enabled apps are out
there. I hope it gets us on the same page regarding why plugins (and plugin
developers!) are crucial for Flipper.

Another important conclusion you could draw from the diagram is that the state
of Flipper plugins is ephemeral and lives in the UI.

## How Flipper talks to a mobile device

Let's dive a bit deeper into how exactly the device and Flipper talk. Flipper
pulls device logs from ADB/IDB. For everything else, Flipper expects the app
(Flipper client inside of the app) to open a WebSocket connection to Flipper.

The algorithm looks like this:

1. The app opens a WebSocket connection to Flipper.
2. They exchange certificates. Flipper connects to the app using ADB/IDB and
   writes a certificate to the app storage.
3. The app opens a secure WebSocket connection to Flipper using the certificate.

Why do we even bother with the certificate exchange process? One of the
potential attack vectors is that a developer could install a malicious app on
the testing device. That app could spin up a WebSocket server and mask itself as
Flipper. However, unlike Flipper, the malicious app can't access the file
storage of another app. As a result, it can't complete the certificate exchange
process.

On mobile devices certificate exchange is important, so that other apps on the
phone can't impersonate Flipper. For browser apps this isn't an issue as the
browser already makes sure a malicious page cannot act as Flipper server. For
platforms like this, we use a simplified connection algorithm:

1. The app opens a WebSocket connection to Flipper.
2. Bingo!

`js-flipper` implements the second algorithm, without the certificate exchange.

## Message protocol and structure

Once the final WebSocket connection is established, Flipper starts talking to
the app:

1. It sends `getPlugins` and `getBackgroundPlugins` messages to get a list of
   plugins supported by the app.
2. Flipper displays the available plugins to the developer.
3. Developer clicks on one of the plugins (enables a plugin).
4. Flipper loads the UI for the plugin. Let's settle on calling the part of the
   plugin "desktop plugin" and the device part of the plugin "client plugin".
5. Flipper sends `init` message to the app.
6. Client plugin `onConnect` code is executed. Read more about Client Plugin API
   [here](https://fbflipper.com/docs/extending/create-plugin/).
7. Whenever a "desktop plugin" needs some data from the device it sends an
   `execute` message to the "client plugin" on the device.
8. "Client plugin" replies with the data.
9. "Client plugin" might force the "desktop plugin" to do something as well by
   sending an `execute` message as well. However, it is rare. In the current
   implementation, the "client plugin" can never expect a reply back from the
   "desktop plugin". In other words, consider it as an event sink, not as a way
   to extract some data from the "desktop plugin".
10. When the plugin is deactivated a `deinit` message is sent to the "client
    plugin".
11. Client plugin `onDisconnect` code is executed.

> The process above is for the insecure WebSocket connections we currently use
> in `js-flipper`. It is more complicated for secure WebSocket connections that
> require certificate exchange.

Flipper expects each message to have the following structure:

```ts
export interface FlipperRequest {
  method: string; // 'getPlugins' | 'getBackgroundPlugins' | 'init' | 'deinit' | 'execute' | 'isMethodSupported'
  params?: {
    api: string; // Plugin ID (name)
    // These nested `method` and `params` could be anything.
    // You set them yourself as you see fit to support the data exchange between the "desktop plugin" and the "client plugin".
    // For example, for 'ReactNativeTicTacToe' we support 2 methods: 'SetState' and 'GetState'.
    // We pass a game state with a 'SetState' message. See https://fbflipper.com/docs/tutorial/javascript/#step-3-call-addplugin-to-add-your-plugin
    method: string;
    params?: unknown;
  };
}
```

The only exception is the response message the "client plugin" sends back when
the data is requested.

```ts
export type FlipperResponse = {
  id: number;
  success?: object | string | number | boolean | null;
  error?: {
    message: string;
    stacktrace?: string;
    name?: string;
  };
};
```

## Building a new client

At this point, you know what messages your client needs to support in a Flipper
client:

- `getPlugins`
- `getBackgroundPlugins`
- `init`
- `deinit`
- `execute`

One other message we did not mention before is `isMethodSupported`. Its job is
to reply back to a "desktop plugin" whether a "client plugin" supports one of
plugin messages (that nested `method` field). It's useful when you have a single
"desktop plugin" implementation, but different "client plugin" implementations.
For example, some operations might not be supported on iOS, but are supported on
Android. Alternatively, it can address version differences between the plugin
installed on the device and the one loaded into Flipper.

If you want to build a proper Flipper client, you also need to provide an
abstraction for plugin developers. Consider matching
[what we have for existing clients](https://fbflipper.com/docs/extending/create-plugin/#flipperplugin).

Most of the groundwork for handling connections and doing certificate exchange
is already done in our
[C++ engine](https://github.com/facebook/flipper/tree/main/xplat). Our iOS,
Android, React Native clients use it under the hood. `js-flipper` implements
everything from scratch using native browser APIs (for Node.js apps we
[require developers to provide a WebSocket implementation](https://github.com/facebook/flipper/tree/main/js/js-flipper#nodejs)).

Here is a detailed document on how to
[implement a client](https://fbflipper.com/docs/extending/new-clients/). You
might also want to check the source code of our existing clients:

- [iOS](https://github.com/facebook/flipper/tree/main/iOS/FlipperKit)
- [Android](https://github.com/facebook/flipper/tree/main/android/src/main)
- [React Native](https://github.com/facebook/flipper/tree/main/react-native/react-native-flipper)
- [JavaScript](https://github.com/facebook/flipper/tree/main/js/js-flipper)

## What's next?

As of now, we do not provide any default plugins you might be used to for
`js-flipper` (Layout, Logs, Navigation, Crash Reporter, and others). We hope
this will change in the future with the help of ur beloved open-source
community!

_Call to action!_

We would like to encourage you to play with `js-flipper`. See how it fits your
use-case and get back back to us with your feedback on
[GitHub](https://github.com/facebook/flipper/issues). If you find yourself
implementing one of your favorite Flipper plugins for `js-flipper`, do not
hesitate and raise a PR!

Plugins can be either generic or very application specific. Plugins can interact
with Redux or MobX stores, read performance data or console logs from the
browser. At Meta, we also see a lot of plugins that are very application
specific. For example, plugins that allow logging in as specific test users with
a single click, reading the internal state of NewsFeed and interacting with it,
simulating photos captured by a smartphone, etc. A Flipper plugin can be any
form of UI that is useful to speed up debugging and tasks on things you work on
frequently!

## P.S. Flipper needs you!

Flipper is maintained by a small team at Meta, yet is serving over a hundred
plugins and dozens of different targets. Our team's goal is to support Flipper
as a plugin-based platform for which we maintain the infrastructure. We don't
typically invest in individual plugins, but we do love plugin improvements. For
example, the support for mocking network requests (on Android) was entirely
contributed by the community (thanks
[James Harmon](https://github.com/bizzguy)!). As was Protobuf support (thanks
[Harold Martin](https://github.com/hbmartin)!).

For that reason, we've marked many requests in the issue tracker as
[PR Welcome](https://github.com/facebook/flipper/issues?q=is%3Aissue+is%3Aopen+label%3A%22PR+welcome%22).
Contributing changes should be as simple as cloning the
[repository](https://github.com/facebook/flipper) and running
`yarn && yarn start` in the `desktop/` folder.

Investing in debugging tools, both generic ones or just for specific apps, will
benefit iteration speed. And we hope Flipper will make it as hassle free as
possible to create your debugging tools. For an overview of Flipper for React
Native, and why and how to build your own plugins, we recommend checking out the
[Flipper: The Extensible DevTool Platform for React Native](https://youtu.be/WltZTn3ODW4)
talk.

Happy debugging!

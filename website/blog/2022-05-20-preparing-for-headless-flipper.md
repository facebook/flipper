---
title: Headless Flipper - what it means for plugin developers
author: Andrey Goncharov
author_title: Software Engineer
author_url: https://github.com/aigoncharov
author_image_url: https://github.com/aigoncharov.png
tags: [flipper, headless, plugins]
description:
  Flipper is moving from an Electron monolith to a headless Node.js app with a
  web UI. It reshapes how we think about plugins and what plugins can do. We
  talk about what changes and how to prepare our plugins for the migration.
image: /img/preparing-for-headless-flipper.jpg
hide_table_of_contents: false
---

![Cover image](/img/preparing-for-headless-flipper.jpg)

We know Flipper as an Electron desktop app that serves mobile developers as
their debugging companion. Thousands of people use Flipper every day to tinker
with their app and get to the bottom of tricky problems.

As announced in the previous
[roadmap post](https://fbflipper.com/blog/2021/10/14/roadmap/), we are committed
to amplifying how Flipper could improve the quality of our software. We want
take Flipper beyond its current role as a complementary debugging tool, provide
a powerful API, and allow using Flipper in more than just the GUI context (we
call it "headless mode"). Imagine talking to your mobile device (or anything
else that runs Flipper Client) from your terminal. Imagine deploying Flipper
remotely in the cloud and interacting with it from your laptop. Imagine using
your favorite plugins for automated testing.

In this post we cover:

- How Flipper changes to facilitate the headless mode
- How it affects plugins
- A migration guide

<!--truncate-->

## How Flipper changes

Let us take a look at how it works today as an Electron app.

![Flipper Electron architecture](/img/flipper-arch-electron.jpg)

Here is what happens:

1. Flipper starts as an Electron application.
   1. WebSocket server starts.
   2. Device discovery starts via adb/idb/metro.
   3. Electron shows a web view with Flipper UI (React).
   4. Flipper UI queries the device discovery service for a list of devices.
2. At this point, Flipper can already run
   ["device" plugins](https://fbflipper.com/docs/extending/desktop-plugin-structure/#creating-a-device-plugin).
   These plugins do not receive a connection to a running app. They talk to the
   device via adb/idb/metro.
3. An app starts on the device.
4. Flipper Client embedded in the app connects to the WebSocket server.
5. Flipper updates the list of known clients and reflects it in the UI.
6. Now Flipper can run
   ["client" plugins](https://fbflipper.com/docs/extending/desktop-plugin-structure/#creating-a-client-plugin).
7. Client plugins talk to the device application over the WebSocket connection.

> You can start Flipper Electron with `yarn start` from the `/desktop` folder.

Here is how Flipper Headless works.

![Flipper Headless architecture](/img/flipper-arch-headless.jpg)

1. Flipper starts as a Node.js application.
   1. WebSocket server starts.
   2. Device discovery starts via adb/idb/metro.
   3. Web server starts.
   4. It serves Flipper UI to a browser.
   5. Flipper UI connects to the WebSocket server.
   6. Flipper UI sends a message over the WebSocket connection to query the
      device discovery service for a list of devices.
2. At this point, Flipper can already run
   ["device" plugins](https://fbflipper.com/docs/extending/desktop-plugin-structure/#creating-a-device-plugin).
   These plugins do not receive a connection to a running app. They talk to the
   device via adb/idb/metro.
3. An app starts on the device.
4. Flipper Client embedded in the app connects to the WebSocket server.
5. Flipper updates the list of known clients. It sends a message over the
   WebSocket connection to Flipper UI with the information about the new device.
6. Now Flipper can run
   ["client" plugins](https://fbflipper.com/docs/extending/desktop-plugin-structure/#creating-a-client-plugin).
7. Client plugins talk to the device application over the WebSocket bridge - the
   connection from Flipper UI to Flipper WebSocket server piped to the
   connection from the device application to the Flipper WebSocket server.

> You can start Flipper Electron with `yarn flipper-server` from the `/desktop`
> folder.

## How it affects plugins

Plugins are hosted by Flipper UI. When it was a part of the Electron app, there
was no problem. Plugins could access any Node.js APIs thanks to Electron magic.
There were no constraints on what plugins could do. After making Flipper UI a
proper web app running in a browser, we limited what plugins can do. They no
longer can access the network stack or the file system because there are no
corresponding browser APIs. Yet, we want to keep Flipper flexible and provide as
much freedom to plugin developers as possible. Moreover, we could not leave the
existing plugins without a clear migration path.

![Flipper remote Node.js API](/img/flipper-node-apis.jpg)

Since we already have a WebSocket connection between Flipper UI and Flipper
Server, we can model almost any request-response and even stream-based Node.js
APIs over it. So far, we exposed a curated subset of them:

- child_process
  - exec
- fs (and [fs-extra](https://www.npmjs.com/package/fs-extra))
  - constants
  - access
  - pathExists
  - unlink
  - mkdir
  - rm
  - copyFile
  - stat
  - readlink
  - readFile
  - writeFile

We also provided a way to
[download a file](https://github.com/facebook/flipper/blob/0f038218f893d86e91714cd91eed8e37d756386c/desktop/flipper-plugin/src/plugin/FlipperLib.tsx#L83)
or send requests to the
[internal infrastructure](https://github.com/facebook/flipper/blob/0f038218f893d86e91714cd91eed8e37d756386c/desktop/flipper-plugin/src/plugin/FlipperLib.tsx#L186).

> Please, find the complete list of available APIs on
> [GitHub](https://github.com/facebook/flipper/blob/0f038218f893d86e91714cd91eed8e37d756386c/desktop/flipper-plugin/src/plugin/FlipperLib.tsx#L95).
> [Here are Node.js API abstractions](https://github.com/facebook/flipper/blob/0f038218f893d86e91714cd91eed8e37d756386c/desktop/flipper-plugin/src/plugin/FlipperLib.tsx#L47)
> specifically.

As you might have noticed, all exposed APIs are of the request-response nature.
They assume a short finite controlled lifespan. Yet, some plugins start
additional web servers or spawn long-living child processes. To control their
lifetime we need to track them on Flipper Server side and stop them whenever
Flipper UI disconnects. Say hello to a new experimental feature - Flipper Server
Add-ons!

![Flipper Server Add-on](/img/flipper-add-on.jpg)

Now, every flipper plugin could have "server add-on" meta-information. Whenever
a Flipper plugin that has a corresponding Server Add-on starts, it sends a
command to Flipper Server to start its Server Add-on counterpart. Flipper plugin
that lives in a browser inside of Flipper UI talks to its server add-on over the
WebSocket connection. Whenever a user disables a plugin, Flipper sends a command
to Flipper Server to stop the add-on. At the same time, if Flipper UI crashes or
the user just closes the tab, Flipper Server can kill the server add-on on its
own.

Flipper plugin can talk to its server add-on companion (see
`onServerAddOnMessage`, `onServerAddOnUnhandledMessage`, `sendToServerAddOn` in
[the docs](https://fbflipper.com/docs/extending/flipper-plugin/#pluginclient))
and act whenever it starts or stops (see `onServerAddOnStart`,
`onServerAddOnStop` in
[the docs](https://fbflipper.com/docs/extending/flipper-plugin/#pluginclient)).

Say, you wrote an ultimate library to find primes. You were cautious of the
resource consumption, so you did it in Rust. You created a CLI interface for
your new shiny library. Now, you want your Flipper plugin to use it. It takes a
long time to find a prime and you want to keep track of the progress. You could
use `getFlipperLib().remoteServerContext.childProcess.exec`, but it is not
flexible enough to monitor progress updates that your CLI sends to stdout. Here
is how you could approach it:

```tsx
// contract.tsx
export interface ServerAddOnEvents {
  // Server add-on sends "progress" events with the progress updates
  progress: number;
}
export interface ServerAddOnMethods {
  // Client plugin send "findPrime" messages to the server add-on to start finding primes
  findPrime: () => Promise<number>;
}

// index.tsx (your plugin)
import {usePlugin, useValue, createState, PluginClient} from 'flipper-plugin';
import {ServerAddOnEvents, ServerAddOnMethods} from './contract';

export const plugin = (
  client: PluginClient<{}, {}, ServerAddOnEvents, ServerAddOnMethods>,
) => {
  const prime = createState<number | null>(null);
  const progress = createState<number>(0);

  client.onServerAddOnStart(async () => {
    const newPrime = await client.sendToServerAddOn('findPrime');
    prime.set(newPrime);
  });

  client.onServerAddOnStart(() => {
    client.onServerAddOnMessage('progress', progressUpdate => {
      progress.set(progressUpdate);
    });
  });

  return {
    prime,
    progress,
  };
};

export const Component = () => {
  const pluginInstance = usePlugin(plugin);
  const prime = useValue(pluginInstance.prime);
  const progress = useValue(pluginInstance.progress);

  return <div>{prime ?? `Calculating (${progress}%) done...`}</div>;
};

// serverAddOn.tsx
import {ServerAddOn} from 'flipper-plugin';
import {exec, ChildProcess} from 'child_process';
import {ServerAddOnEvents, ServerAddOnMethods} from './contract';

const serverAddOn: ServerAddOn<ServerAddOnEvents, ServerAddOnMethods> =
  async connection => {
    let findPrimeChildProcess: ChildProcess | undefined;

    connection.receive('findPrime', () => {
      if (findPrimeChildProcess) {
        // Allow only one findPrime request at a time. Finding primes is expensive!
        throw new Error('Too many requests!');
      }

      // Start our awesome Rust lib
      findPrimeChildProcess = exec('/find-prime-cli', {shell: true});

      // Return a Promise that resolves when a prime is found.
      // Flipper will serialize the value the promise is resolved with and send it oer the wire.
      return new Promise(resolve => {
        // Listen to stdout of the lib for the progress updates and, eventually, the prime
        findPrimeChildProcess.stdout.on('data', data => {
          // Say, data is a stringified JSON
          const parsed = JSON.parse(data);

          if (parsed.type === 'progress') {
            connection.send('progress', parsed.value);
            return;
          }

          // Allow new requests to find new primes
          findPrimeChildProcess = undefined;
          // If it is not a progress update, then a prime is found.
          resolve(parsed.value);
        });
      });
    });
  };

export default serverAddOn;
```

## Migration guide

1. Examine your plugins for Node.js APIs. Replace them with
   `getFlipperLib().remoteServerContext.*` calls.

   ```tsx
   // before
   import {mkdir} from 'fs/promises';

   export const plugin = () => {
     const myAwesomeFn = async () => {
       await mkdir('/universe/dagobah');
     };

     return {
       myAwesomeFn,
     };
   };

   // after
   import {getFlipperLib} from 'flipper-plugin';

   export const plugin = () => {
     const myAwesomeFn = async () => {
       await getFlipperLib().remoteServerContext.mkdir('/universe/dagobah');
     };

     return {
       myAwesomeFn,
     };
   };
   ```

2. If your plugin uses network stack of spawns a subprocess, consider creating a
   Server Add-on.

   1. In your plugin's folder create a new file - `serverAddOn.tsx`
   2. In your plugin's package.json add fields `serverAddOn` and
      `flipperBundlerEntryServerAddOn`

      ```js
      {
         // ...
         "serverAddOn": "dist/serverAddOn.js",
         "flipperBundlerEntryServerAddOn": "serverAddOn.tsx",
         // ...
      }
      ```

   3. Move your Node.js API calls to `serverAddOn.tsx`

3. Verify your plugin works in a browser environment.
   1. Clone [Flipper repo](https://github.com/facebook/flipper).
   2. Navigate to the `desktop` folder.
   3. In your terminal run `yarn`.
   4. Run `yarn flipper-server`.
   5. Load your plugin and make sure it works.

## P.S. Flipper needs you!

Flipper is maintained by a small team at Meta, yet is serving over a hundred
plugins and dozens of different targets. Our team's goal is to support Flipper
as a plugin-based platform for which we maintain the infrastructure. We don't
typically invest in individual plugins, but we do love plugin improvements.

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

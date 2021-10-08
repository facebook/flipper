# Flipper Desktop

This folder contains everything to run the Flipper 'Desktop', that is, the UI which you use to interact with the device / app under debug.

### Packages provided here:

* flipper-common: utilities & types shared between client, server, flipper-plugin
* flipper-server-core: all device & client management goes in here. Basically flipper's backend
* flipper-ui-core: all UI goes in here, as far as it doesn't depend on Electron
* flipper-ui-electron: the Electron app, will load server-core and ui-core, and glue them together, providing implementations for some electron * specific stuff like dialgos
* flipper-server: A node process hosting flipper-server-core, that can be connected to over websockets. And probably can serve a browser version of the UI as well.
* flipper-ui-browser: thin wrapper around flipper-ui-core, providing some browser specific behavior / stubs.
* flipper-dump: (might remove later), but want to hack a quick and dirt flipper dump in here, as alternative way to test flipper-server-core.
* flipper-plugin: The flipper SDK used by plugins. Exposes all API's that can be used by plugins
* pkg: CLI tool to manage building flipper plugins
* pkg-lib
* plugin-lib
* babel-transformer
* doctor
* eslint-plugin-flipper

### Packages overview

```
flipper-ui-electron:
   - flipper-server-core (directly embedded)
   - flipper-ui-core
       - plugins (prebundled)
   - plugins (installable)
       - flipper-plugin

flipper-server
   - flipper-server-core
   - flipper-ui-browser (served by webserver)
       - flipper-ui-core (communicates using WebSocket with server-core)
           - plugins (prebundled)
   - plugins (installable)?

flipper-dump
   - flipper-server-core
```

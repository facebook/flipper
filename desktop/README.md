# Flipper Desktop

This folder contains everything to run the Flipper 'Desktop', that is, the UI which you use to interact with the device / app under debug.

### Packages provided here:

* flipper-common: utilities & types shared between client, server, and plugins
* flipper-ui-core: all UI goes in here, as far as it doesn't depend on Electron
* flipper-server: All device & client management goes in here. Basically flipper's backend. Can be connected to over websockets. Also, it can serve a browser version of the UI as well.
* flipper-ui-browser: thin wrapper around flipper-ui-core, providing some browser specific behavior / stubs.
* flipper-dump: (might remove later) as an alternative way to test flipper-server.
* flipper-plugin: The flipper SDK used by plugins. Exposes all API's that can be used by plugins
* pkg: CLI tool to manage building flipper plugins
* pkg-lib
* plugin-lib
* babel-transformer
* doctor
* eslint-plugin-flipper

### Packages overview

```
flipper-server
   - flipper-ui-browser (served by webserver)
       - flipper-ui-core (communicates using web sockets with server-core)
           - plugins (prebundled)
   - plugins (installable)?

flipper-dump
   - flipper-server
```

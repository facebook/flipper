# Flipper Desktop

This folder contains everything to run the Flipper 'Desktop', that is, the UI which you use to interact with the device / app under debug.

### Packages provided here:

* flipper-common: utilities & types shared between client, server, and plugins
* flipper-server: All device & client management goes in here. Basically flipper's backend. Can be connected to over websockets. Also, it can serve a browser version of the UI as well.
* flipper-ui: all UI goes in here
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
   - flipper-ui (served by webserver)
      - plugins (prebundled)
   - plugins (installable)?

flipper-dump
   - flipper-server
```

# Sonar ![Travis](https://travis-ci.org/facebook/Sonar.svg?branch=master)

Sonar is a platform for debugging mobile apps on iOS and Android. Visualize, inspect, and control your apps from a simple desktop interface. Use Sonar as is or extend it using the plugin API.

![Sonar](/website/static/img/splash@2x.png)

## Mobile development

Sonar aims to be your number one companion for mobile app development on iOS and Android. Therefore, we provide a bunch of useful tools including a log viewer, interactive layout inspector, and network inspector.

## Extending Sonar

Sonar is built as a platform. In addition to using the tools already included, you can create your own plugins to visualize and debug data from your mobile apps. Sonar takes care of sending data back and forth, calling functions, and listening for events on the mobile app.

## Contributing to Sonar

Both Sonar's desktop app and native mobile SDKs are open-source and MIT licensed. This enables you to see and understand how we are building plugins, and of course join the community and help improve Sonar. We are excited to see what you will build on this platform.

# In this repo

This repository includes all parts of Sonar. This includes:

* Sonar's desktop app built using [Electron](https://electronjs.org) (`/src`)
* native Sonar SDKs for iOS (`/iOS`)
* native Sonar SDKs for Android (`/android`)
* Plugins:
  * Logs (`/src/device-plugins/logs`)
  * Layout inspector (`/src/plugins/layout`)
  * Network inspector (`/src/plugins/network`)
* website and documentation (`/website` / `/docs`)

# Getting started

Please refer to our [Getting Started guide](https://fbsonar.com/docs/getting-started.html) to set up Sonar.

## Requirements

* macOS (while Sonar is buildable using other systems as well, only macOS is officially supported)
* node >= 8
* yarn >= 1.5
* iOS developer tools (for developing iOS plugins)
* Android SDK and adb

## Starting the desktop app

```
git clone https://github.com/facebook/Sonar.git
cd Sonar
yarn
yarn start
```

NOTE: If you're on Windows, you need to use Yarn 1.5.1 until [this issue](https://github.com/yarnpkg/yarn/issues/6048) is resolved.

## Building the desktop app

```
yarn build --mac --version $buildNumber
```

## Documentation

Find the full documentation for this project at [fbsonar.com](https://fbsonar.com/docs).

## Contributing and license

See the CONTRIBUTING file for how to help out.
Sonar is MIT licensed, as found in the LICENSE file.

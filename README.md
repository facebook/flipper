Sonar is a desktop app and client API for real time debugging of mobile apps. Sonar enables developers to quickly build plugins which expose runtime information from Android and iOS apps in a easy to use desktop interface.

# Why should I build tools on top of Sonar?

Sonar provides you with everything you need to quickly get your tools into people hands. Sonar provides a simple API for communicating with both Android and iOS devices, reconnecting if connection is lost as well as managing multiple connections. With Sonar's built in set of components it is easy to make good looking, easy to use, and powerful developer tools.

# In this repo

This repository includes all parts of Sonar. This includes:

* Sonar's desktop app built using Electron (`/src`)
* native Sonar SDKs for iOS
* native Sonar SDKs for Android
* Plugins:
  * Logs (`/src/device-plugins/logs`)
  * Layout inspector (`/src/plugins/layout`)
  * Network inspector (`/src/plugins/network`)
* website and documentation (`/website` / `/docs`)

# Getting started

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

## Building the desktop app

```
yarn build [macOnly] [build-number=$buildNumber]
```

A binary for macOS is created in `dist/mac`. `macOnly` and `build-number` are optional params.

## Documentation

Find the full documentation for this project at [fbsonar.com](https://fbsonar.com/).

## Contributing and license

See the CONTRIBUTING file for how to help out.
Sonar is MIT licensed, as found in the LICENSE file.

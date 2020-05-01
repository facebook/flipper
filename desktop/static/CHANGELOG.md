# 0.40.0 (29/4/2020)

 * D20942453 -  Background plugins will no longer receive a Flipper connection if they are disabled. This should significantly reduce the overall load of Flipper both on the device and desktop when unused plugins are disabled used, which could otherwise generate 10MB/s of network traffic certain scenarios. All plugins *should* be able to handle to this gracefully, but since this is quite a fundamental change, reach out to the Flipper team when in doubt!


# 0.38.0 (21/4/2020)

 * D20805231 -  Internals: plugins added as "yarn workspaces" into the root package.json to simplify dependency management between them
 * D20898133 -  Internals: it is now possible to add modules for re-use by different plugins into `desktop/plugins` folder.
 * D20864002 -  Internals: include default plugins into the main bundle instead producing separate bundles for them.
 * D20993073 -  Experimental support for Fast Refresh in dev mode can be enabled by `yarn start --fast-refresh`.
 * D21074769 -  new command-line flag "--open-dev-tools" to automatically open Chrome Dev Tools for Flipper debugging.
 * D21074173 -  Support new packaging format for plugins.
 * D21129691 -  "flipper-pkg bundle" command for bundling plugins before publishing.


# 0.37.0 (8/4/2020)

 * D20868923 -  Fix connections on Android devices with older SDKs (19)
 * D20822063 -  The QPL plugin now shows qpl start times
 * D20836635 -  Stabilized QPL plugin to avoid crashes with iOS devices, normalized event times to always report in milliseconds.


# 0.36.0 (3/4/2020)

 * D20673166 -  New Hermes Debugger plugin for React Native apps.
 * D20789712 -  Fixed error "SHA-1 for file is not computed" on 3rd party plugin compilation in dev mode (yarn start).
 * D20767096 -  Fixed an issue where QPL points where not showing up in the marker timeline
 * D20724437 -  Fixed applying of product attributes (title, publisher etc) to Flipper builds


# Pre-history

Please see our [releases GitHub page](https://github.com/facebook/flipper/releases) for a full list of changes of old releases.

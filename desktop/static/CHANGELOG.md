# 0.47.0 (17/6/2020)

 * D21979475 -  Fix scrolling to inspected element in Layout plugin
 * D22042960 -  Versions of bundled plugins will be matching Flipper core version.
 * D22047276 -  Add ability to reverse log by time


# 0.46.0 (9/6/2020)

 * D21903394 -  Device plugins are now expanded by default, and the expand / collapse state will now be remembered across restarts
 * D21903760 -  Fix regression in the layout plugin where accessibility info was rendered in the wrong place
 * D21907597 -  Improved the startup sequence for emulated iOS devices, so that devices and apps connect a lot faster after starting Flipper
 * D21929679 -  Fixed regression where analytics messages where lost
 * D21883086 -  The open source version now works with physical iOS devices.


# 0.45.0 (3/6/2020)

 * D21858849 -  Foreground plugins will burn less CPU when they're very chatty


# 0.44.0 (21/5/2020)

 * D21283157 -  Fixed several minor layout issues in the Layout plugin


# 0.42.0 (12/5/2020)

 * D21214898 -  Add multiple selector to layout inspector to allow user to select components at a position
 * D21450694 -  Calling `client.call()` or `client.send()` now fails to type-check if params is not an object, to match client implementations.


# 0.41.0 (5/5/2020)

 * D21302821 -  The JSON inspector in plugins like GraphQL no longer freezes Flipper temporarily when expanding large data sets and will remain interactive during
 * D21347880 -  It is now possible to search inside GraphQL responses


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

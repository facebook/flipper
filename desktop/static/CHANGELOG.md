# 0.70.0 (6/1/2021)

 * [D25466557](https://github.com/facebook/flipper/search?q=D25466557&type=Commits) -  [Internal]
 * [D25497305](https://github.com/facebook/flipper/search?q=D25497305&type=Commits) -  [Internal]
 * [D25557789](https://github.com/facebook/flipper/search?q=D25557789&type=Commits)
 * [D25620908](https://github.com/facebook/flipper/search?q=D25620908&type=Commits) -  [Internal]
 * [D25755812](https://github.com/facebook/flipper/search?q=D25755812&type=Commits) -  Fix issue where React Native plugins didn't show up in the Sandy layout


# 0.66.0 (18/11/2020)

 * [D24890375](https://github.com/facebook/flipper/search?q=D24890375&type=Commits) -  [Sandy][Navigation] on Android, the currently active deeplink of the application will now be shown in the sidebar
 * [D24919363](https://github.com/facebook/flipper/search?q=D24919363&type=Commits) -  Automatically start an iOS simulator to launch a device when none is running yet
 * [D24950080](https://github.com/facebook/flipper/search?q=D24950080&type=Commits) -  `flipper-pkg init` now uses the new Sandy plugin infrastructure ant Ant.design component system


# 0.65.0 (11/11/2020)

 * [D24826802](https://github.com/facebook/flipper/search?q=D24826802&type=Commits) -  [Facebook] Add support form support for Flipper itself


# 0.64.0 (28/10/2020)

 * [D24506315](https://github.com/facebook/flipper/search?q=D24506315&type=Commits) -  Upgrade internal React version to v17


# 0.63.0 (20/10/2020)

 * [D23403095](https://github.com/facebook/flipper/search?q=D23403095&type=Commits) -  [Network] Non-binary request are not properly utf-8 decoded on both iOS and Android, both when gzipped and when not gzipped


# 0.62.0 (12/10/2020)

 * [D24136401](https://github.com/facebook/flipper/search?q=D24136401&type=Commits) -  [iOS][Network] Network plugin now supports iOS 14


# 0.60.0 (30/9/2020)

 * [D23718455](https://github.com/facebook/flipper/search?q=D23718455&type=Commits) -  [Internal]


# 0.59.0 (29/9/2020)

 * [D23908151](https://github.com/facebook/flipper/search?q=D23908151&type=Commits) - 
 * [D23729972](https://github.com/facebook/flipper/search?q=D23729972&type=Commits) -  Ability to reload single auto-updated plugin without full Flipper restart.


# 0.58.0 (23/9/2020)

 * [D23681402](https://github.com/facebook/flipper/search?q=D23681402&type=Commits) -  removed support for plugins packaged using legacy format (v1), so they won't appear in Plugin Manager anymore.
 * [D23682756](https://github.com/facebook/flipper/search?q=D23682756&type=Commits) -  changed the way of plugin loading, and removed obsolete dependencies, which should reduce bundle size and startup time.
 * [D23706701](https://github.com/facebook/flipper/search?q=D23706701&type=Commits) -  faster reload after plugin install/uninstall/update.
 * [D23565000](https://github.com/facebook/flipper/search?q=D23565000&type=Commits) -  Flipper now uses Electron 10
 * [D23027793](https://github.com/facebook/flipper/search?q=D23027793&type=Commits) -  [network] Allow user to create new mock routes by highlighting existing network requests in the Network plugin


# 0.55.0 (1/9/2020)

 * [D23345560](https://github.com/facebook/flipper/search?q=D23345560&type=Commits) -  Flipper Self inspection - Flipper Messages plugin added to dev builds to show messages sent/received from clients
 * [D23369774](https://github.com/facebook/flipper/search?q=D23369774&type=Commits) -  React DevTools plugin: fixed issue when sometimes multiple copies of dev tools were opened.


# 0.54.0 (25/8/2020)

 * [D23198103](https://github.com/facebook/flipper/search?q=D23198103&type=Commits) -  Introduce 'Debug Logs' section to help users to troubleshoot issues or to provide more accurate reports.
 * [D23220937](https://github.com/facebook/flipper/search?q=D23220937&type=Commits) -  Removed some irrelevant errors from startup flow
 * [D23293248](https://github.com/facebook/flipper/search?q=D23293248&type=Commits) -  [Databases] Fixed escaping of column names, see #1426
 * [D23292543](https://github.com/facebook/flipper/search?q=D23292543&type=Commits) -  Fixed react-native-flipper causing Android release builds to fail


# 0.53.0 (19/8/2020)

 * [D22999105](https://github.com/facebook/flipper/search?q=D22999105&type=Commits) -  Changelog entries now link to their GitHub commits
 * [D22977811](https://github.com/facebook/flipper/search?q=D22977811&type=Commits) -  Allow user to change response code for a mock request
 * [D22999905](https://github.com/facebook/flipper/search?q=D22999905&type=Commits) -  Android network inspector can now handle responses large than 1MB.
 * [D22983828](https://github.com/facebook/flipper/search?q=D22983828&type=Commits) -  [Internal]
 * [D23158628](https://github.com/facebook/flipper/search?q=D23158628&type=Commits) -  It is now possible to directly open CKComponents from the Layout inspect


# 0.52.1 (6/8/2020)

 * D22922126 -  It is now possible to directly open source files from the Layout inspector


# 0.52.0 (4/8/2020)

 * D22865373 -  [Network plugin] Improved presentation of request / response bodies and fixed issues where they would sometimes not be displayed.
 * D22897793 -  All text is now selectable by default in Flipper.


# 0.51.0 (24/7/2020)

 * D22528729 -  Added button "Restart Flipper" to plugin auto-update notifications.
 * D22548586 -  Visual Android View inspection available in layout plugin export files.


# 0.49.0 (30/6/2020)

 * D22255125 -  Added command `flipper-pkg checksum` for computing the total checksum of all the files included into plugin package.
 * D22283092 -  Fix screen recording for Android 11 beta


# 0.48.0 (24/6/2020)

 * D22151908 - Fix Network Mock Dialog crashes when 'Add Route' button is pressed  https://github.com/facebook/flipper/issues/1280
 * D22158791 - Added "--production" option for "flipper-pkg bundle" command to produce minified plugin packages without source maps.
 * D22158898 - Disabled source maps in Flipper release builds thus reducing size by ~20%.
 * D22160443 - Upgrade Flow to 0.127.
 * D22160304 - Fix react-native-flipper dependency pulling in debug-only artifacts into release builds.


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

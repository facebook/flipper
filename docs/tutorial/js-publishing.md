---
id: js-publishing
title: Publishing your Plugin
sidebar_label: Publishing
---

Once you're happy with your plugin and want the world to see it,
you can publish it to npm. Ensure that your plugin follows these
two rules:

- The package name should to start with "flipper-plugin-". This makes
  it easier to see what the purpose of the package is.
- The package must include the keyword "flipper-plugin".
- Source code of the plugin must be bundled by "flipper-pkg" tool.

A valid example `package.json` could look like this:

```json
{
  "name": "flipper-plugin-sea-mammals",
  "id": "sea-mammals",
  "specVersion": 2,
  "version": "2.0.0",
  "main": "dist/bundle.js",
  "flipperBundlerEntry": "src/index.tsx",
  "license": "MIT",
  "keywords": ["flipper-plugin"],
  "icon": "apps",
  "title": "Sea Mammals",
  "category": "Example Plugin",
  "scripts": {
    "prepack": "flipper-pkg bundle"
  },
  "dependencies": {
    "flipper": "latest"
  },
  "devDependencies": {
    "flipper-pkg": "latest"
  }
}
```

When you have confirmed that your `package.json` is correct,
run `yarn publish` or `npm publish` and follow the instructions.

## Installing Plugins

Once your plugin is published you can find it, alongside other
available Flipper plugins, by clicking on "Manage Plugins..."
in the bottom of the left sidebar and selecting the
"Install Plugins" tab. It may take a few moments for the
search index to update and your plugin to appear.

![Install plugins](assets/install-plugins.png)

## Native Distribution

Depending on whether the client-side part of your plugin targets
Android, iOS or React Native, we recommend you use the standard
package distribution mechanism for the platform.

This may be Maven Central, JCenter or GitHub Packages for Android,
CocoaPods for iOS and npm or GitHub Packages for React Native.
Make sure to leave setup instructions in the README of your
npm package.

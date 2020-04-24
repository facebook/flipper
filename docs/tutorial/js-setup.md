---
id: js-setup
title: Building a Desktop Plugin
sidebar_label: Building a Desktop Plugin
---

Now that we have the native side covered, let's display the data we're sending
on the desktop side. You can check out the full workflow of building Flipper desktop
plugins here: https://fbflipper.com/docs/extending/js-setup.html.

![Custom cards UI for our sea mammals plugin](assets/js-custom.png)

## Dynamic Plugin loading

By default, Flipper will start with the plugins it was bundled with. You can
configure it to also look for plugins in custom directories. To do that,
modify the `~/.flipper/config.json` file that is created the first time
you start Flipper and add a newly created directory the `pluginPaths` attribute.

Your file will then look something like this:

```json
{
  "pluginPaths": [
    "~/Flipper/custom-plugins/"
  ],
  ...
}
```

## Creating the Plugin Package

With the loading part out of the way, we can create the new plugin. For that, first
create a new folder inside the custom plugins directory. Then use `yarn init` (`npm init` if that's more your style)
to initialise a new JavaScript package:

```bash
$ cd ~/Flipper/custom-plugins/
$ mkdir sea-mammals
$ cd sea-mammals
$ yarn init
```

Open the `package.json` and edit it. There are a few important things:
1) "name" must start with "flipper-plugin-"
2) "keywords" must contain "flipper-plugin"
3) "id" must be the same as used on native side, e.g. returned by getId() method in Android plugin. In our case that is "sea-mammals".
4) "specVersion" must contain the version of the specification according to which the plugin is defined.  Currently, Flipper supports plugins defined by the specification version 2, while version 1 is being deprecated.
5) "title" and "icon" are optional fields specifying the plugin item appearance in the Flipper sidebar.

For instance:

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
  "peerDependencies": {
    "flipper": "latest"
  },
  "devDependencies": {
    "flipper": "latest",
    "flipper-pkg": "latest"
  }
}
```
*See [package.json](https://github.com/facebook/flipper/blob/master/desktop/plugins/seamammals/package.json)*

Now that our package has been set up, we are ready to build a UI for our plugin. Either by using a standardized table-based plugin, or by creating a custom UI.

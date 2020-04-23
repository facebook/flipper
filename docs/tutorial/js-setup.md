---
id: js-setup
title: Building a Desktop Plugin
sidebar_label: Building a Desktop Plugin
---

Now that we have the native side covered, let's display the data we're sending
on the desktop side.

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

When choosing the package name, remember to use the name we have specified on the native side as ID.
In our case, that is "sea-mammals". Once done, open the `package.json`. In addition to the name,
you can also specify a title to show in the Flipper sidebar and an icon to display here. For instance:

```json
{
  "name": "sea-mammals",
  "version": "1.0.0",
  "main": "index.tsx",
  "license": "MIT",
  "keywords": ["flipper-plugin"],
  "icon": "apps",
  "title": "Sea Mammals",
  "category": "Example Plugin",
  "dependencies": {
    "flipper": "latest"
  }
}
```
*See [package.json](https://github.com/facebook/flipper/blob/master/desktop/plugins/seamammals/package.json)*

Now that our package has been set up, we are ready to build a UI for our plugin. Either by using a standardized table-based plugin, or by creating a custom UI.

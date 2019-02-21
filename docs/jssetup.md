---
id: js-setup
title: JavaScript Setup
sidebar_label: JavaScript Setup
---

## Creating the plugin UI

To create the desktop part of your plugin, initiate a new JavaScript project using `yarn init` and make sure your package name is the plugin's ID you are using in the native implementation. Create a file called `index.js`, which is the entry point to your plugin. A sample `package.json`-file could look like this:

```
{
  "name": "myplugin",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "dependencies": {},
  "title": "My Plugin",
  "icon": "apps",
  "bugs": {
    "email": "you@example.com"
  }
}
```

Flipper uses some fields from the `package.json` in the plugin. The `name` is used as, the ID to identify the mobile counterpart. A `title` can be set, that is shown in Flipper's sidebar, same is true for the `icon`. We also strongly encourage to set a `bugs` field specifying an email and/or url, where bugs for the plugin can be reported.

In `index.js` you can now create your plugin. Take a look at [Writing a plugin](writing-a-plugin.md) to learn how a plugin can look like. Also, make sure to check out [Flipper's UI components](ui-components.md) when building your plugin.

### Dynamically loading plugins

Once a plugin is created, Flipper can load it from its folder. The path from where the plugins are loaded is specified in `~/.flipper/config.json`. The paths specified in `pluginPaths` need to point to a folder containing a subfolder for every plugin. For example you can create a directory `~/flipper-plugins` and set `pluginPaths` in Flipper's config to `["~/flipper-plugins"]`. This directory needs to contain a sub-directory for every plugin you create. In this example there would be a directory `~/flipper-plugins/myplugin` that contains your plugin's `package.json` and all code of your plugin.

### npm dependencies

If you need any dependencies in your plugin, you can install them using `yarn add`. The Flipper UI components exported from `flipper`, as well as `react` and `react-dom` don't need to be installed as dependencies. Our plugin-loader makes these dependencies available to your plugin.

### ES6, babel-transforms and bundling

Our plugin-loader is capable of all ES6 goodness, flow annotations and JSX and applies the required babel-transforms without you having to care about this. Also you don't need to bundle your plugin, you can simply use ES6 imports and it will work out of the box.

## Working on the core

If you only want to work on a plugin, you don't need to run the development build of Flipper, but you can use the production release. However, if you want to contribute to Flipper's core, add additional UI components, or do anything outside the scope of a single plugins this is how you run the development version of Flipper.

Make sure you have a recent version of node.js and yarn installed on your system (node ≥ 8, yarn ≥ 1.5). Then run the following commands:

```
git clone https://github.com/facebook/flipper.git
cd flipper
yarn
yarn start
```

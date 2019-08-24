---
id: js-setup
title: JavaScript Plugin Definition
---

All JavaScript Flipper plugins must be self-contained in a directory. This directory must contain at a minimum the following two files:
* package.json
* index.tsx

The best way to initialize a JS plugin is to create a directory, and run `yarn init` inside it. Make sure your package name is the same as the identifier of the client plugin, e.g. if your Java plugin returns `myplugin` from its `getId()` method, the `name` field in your `package.json` should also be `myplugin`.

Plugins can be written in plain ES6 JavaScript, [Flow](https://flow.org/) or [TypeScript](https://www.typescriptlang.org/) but we recommend you use TypeScript for the best development experience. We also recommend you use the file extension `.tsx` when using TypeScript which adds support for inline React expressions.

After `yarn init` finishes, create an `index.tsx` file which will be the entry point to your plugin. An example `package.json` file could look like this:

Example `package.json`:
```
{
  "name": "myplugin",
  "version": "1.0.0",
  "main": "index.tsx",
  "license": "MIT",
  "dependencies": {},
  "title": "My Plugin",
  "icon": "apps",
  "bugs": {
    "email": "you@example.com"
  },
  "dependencies": {
    "flipper": "latest"
  }
}
```

Important attributes of `package.json`:

`name` Used as the plugin identifier and **must match the mobile plugin Identifier**.

`title` Shown in the main sidebar as the human readable name of the plugin.

`icon` Determines the plugin icon which is displayed in the main sidebar.

`bugs` Specify an email and/or url, where plugin bugs should be reported.

In `index.tsx` you will define the plugin in JavaScript. This file must export a default class that extends `FlipperPlugin`. Browse our [JS API docs](js-plugin-api) to see what you can do, and make sure to check out our [UI Component Library](ui-components.md) for lots of pre-made components.

Example `index.tsx`:
```js
import {FlipperPlugin} from 'flipper';

export default class extends FlipperPlugin {
  render() {
    return 'hello world';
  }
}
```

### Dynamically loading plugins

Flipper will load and run plugins it finds in a configurable location. The paths searched are specified in `~/.flipper/config.json`. These paths, `pluginPaths`, should contain one folder for each of the plugins it stores. An example config setting and plugin file structure is shown below:

`~/.flipper/config.json`:
```
{
  ...,
  "pluginPaths": ["~/flipper-plugins"]
}
```
Plugin File Structure:
```
~ flipper-plugins/
    my-plugin/
      package.json
      index.tsx
```

### npm dependencies

If you need any dependencies in your plugin, you can install them using `yarn add`.

### ES6, babel-transforms and bundling

Our plugin-loader is capable of all ES6 goodness, Flow annotations, TypeScript, and JSX and applies the required babel-transforms without you having to care about this. You don't need to bundle your plugin, you can simply use ES6 imports and it will work out of the box.

## Working on the core

If you only want to work on a plugin, you don't need to run the development build of Flipper, but you can use the production release. However, if you want to contribute to Flipper's core, add additional UI components, or do anything outside the scope of a single plugins this is how you run the development version of Flipper.

Make sure you have a recent version of node.js and yarn installed on your system (node ≥ 8, yarn ≥ 1.5). Then run the following commands:

```
git clone https://github.com/facebook/flipper.git
cd flipper
yarn
yarn start
```

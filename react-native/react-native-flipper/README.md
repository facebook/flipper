# react-native-flipper

This package exposes JavaScript bindings to talk from React Native JavaScript directly to flipper.

This package might also be required by other Flipper plugins for React Native.

## Installation

Run the following command in the root of your React Native project

`yarn add react-native-flipper`

Note that this package requires React Native 0.62 or higher.

## Usage

How to build Flipper plugins is explained in the flipper documentation:
[Creating a Flipper plugin](https://fbflipper.com/docs/extending/index.html).
Building a Flipper plugin involves building a plugin for the Desktop app, and a plugin that runs on a Device (Native Android, Native IOS or React Native). This package is only needed for the plugin that runs on the mobile device, in React Native, and wants to use the JavaScript bridge.

This package exposes one method: `addPlugin`.
The `addPlugin` accepts a `plugin` parameter, that registers a client plugin and will fire the relevant callbacks if the corresponding desktop plugin is selected in the Flipper Desktop. The full plugin API is documented [here](https://fbflipper.com/docs/extending/create-plugin.html).

## Example

An example plugin can be found in [examples/FlipperTicTacToe.js](../sample/FlipperTicTacToe.js).

The corresponding Desktop plugin ships by default in Flipper, so importing the above file and dropping the `<FlipperTicTacToe />` component somewhere in your application should work out of the box.

The sources of the corresponding Desktop plugin can be found [here](../../desktop/plugins/rn-tic-tac-toe).

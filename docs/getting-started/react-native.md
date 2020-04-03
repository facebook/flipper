---
id: react-native
title: Set up your React Native App
sidebar_label: React Native
---

<div class="warning">

This tutorial is for React Native applications using version **0.62.0**, please refer to the following if you are using a different version:

* [Flipper on RN < 0.61.5 tutorial](https://github.com/facebook/flipper/blob/da25241f7fbb06dffd913958559044d758c54fb8/docs/getting-started.md#setup-your-react-native-app)
* [Flipper on RN 0.61.5 - 0.62 tutorial](https://github.com/facebook/flipper/blob/4297b3061f14ceca4d184aa3eebd0731b5bf20f5/docs/getting-started.md#setup-your-react-native-app)

</div>


After generating your project with `npx react-native init`, the Flipper integration is setup out-of-the-box for debug builds:

* For Android, start the Flipper Desktop application, and start your project using `yarn android`. Your application should appear in Flipper.
* For iOS, run `pod install` once in the `ios` directory of your project. After that, run `yarn ios` and start Flipper. Your application should show up in Flipper.

By default, the following plugins will be available:

* Layout Inspector
* Network
* Databases
* Images
* Shared Preferences
* Crash Reporter
* React DevTools
* Metro Logs

Additional plugins might be installed through NPM, please follow the instructions as provided by the plugin authors.

To create your own plugins and integrate with Flipper using JavaScript, check out our [writing plugins for React Native](tutorial/react-native) tutorial!

If you ever need to update the Flipper SDKs used in your project, the versions can be bumped in the `ios/Podfile` and `android/gradle.properties` files of your project. 
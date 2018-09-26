---
id: troubleshooting
title: Troubleshooting Issues
sidebar_label: Troubleshooting Issues
---

We hope that flipper works well out of the box, but the software is a work in progress and problems will occur. Below are some known issues and steps you can take to try to resolve them.

## Desktop app

### Flipper won't launch

* If the window is appearing, try opening Chrome dev tools within Flipper. To do so, from the View menu select Toggle Developer Tools or press CMD+Option+I and check if there are any errors on the console.
* Launch Flipper from the command line using `/Applications/Flipper.app/Contents/MacOS/Flipper` This should give you some logs, that might be helpful when debugging.
* Delete `~/.flipper` and try relaunching Flipper
* Delete Flipper from your applications folder and redownload [Flipper](https://www.facebook.com/fbflipper/public/mac)
* If you're using `yarn start` to run from source, make sure all dependencies are installed correctly by running yarn install

### iOS Simulator missing from devices dropdown

* Check that `xcode-select -p` shows the same xcode version that you're using. If not, see xcode-select for how to select the correct version.

### No plugins showing up for your device

* Check your device isn't on the list of [known incompatibilities](#known-incompatibilities)
* Make sure your version of Flipper is up to date.
* Make sure the mobile SDK you are using is relatively recent (<1 month old).
* Open Chrome dev tools within Flipper. To do so, from the View menu select Toggle Developer Tools or press CMD+Option+I and check if there are any errors on the console.
* Delete `~/.flipper`
* **Uninstall** and reinstall the mobile app.
* If no app plugins are showing up, there may be a connectivity issue between Flipper and your app. Check [connection issues](#connection-issues) to see if anything is failing.

### Connection Issues
The Flipper SDK includes an in-app connection diagnostics screen to help you diagnose problems.

#### Android
Replace `<APP_PACKAGE>` below with the package name of your app, e.g. `com.facebook.flipper.sample`.
On a terminal, run the following:
```bash
adb shell am start -n <APP_PACKAGE>/com.facebook.flipper.android.diagnostics.FlipperDiagnosticActivity
```
This will only work if you added `FlipperDiagnosticActivity` to your `AndroidManifest.xml`. See [getting started](getting-started.html) for help.

#### iOS
You'll need to manually add this [ViewController](https://github.com/facebook/flipper/blob/master/iOS/FlipperKit/FlipperDiagnosticsViewController.m) to your app to see the in-app diagnostics.

### Known Incompatibilities
The following devices are known to be incompatible or face issues with flipper:
* Physical iOS devices. Currently on iOS, only simulators are supported. [GitHub Issue](https://github.com/facebook/flipper/issues/262)
* Some Samsung devices. [GitHub Issue](https://github.com/facebook/flipper/issues/92)
* Genymotion emulators on Android 8+ are reported to have issues.

### File an Issue
Still not working? File an issue on [GitHub](https://github.com/facebook/flipper) with the chrome dev tools logs and the output from the diagnostics screen, if relevant.

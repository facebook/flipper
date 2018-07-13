---
id: shared-preferences-plugin
title: Shared Preferences
---

Easily inspect and modify the data contained within your app's shared preferences.

![Shared Preferences Plugin](/docs/assets/shared-preferences.png)

## Setup

Note: this plugin is only available for Android.

### Android

```java
import com.facebook.sonar.plugins.sharedpreferences.SharedPreferencesSonarPlugin;

client.addPlugin(
    new SharedPreferencesSonarPlugin(context, "my_shared_preference_file"));
```

## Usage

All changes to the given shared preference file will automatically appear in Sonar. You may also edit the values in Sonar and have them synced to your device. This can be done by clicking on the value of the specific key you wish to edit, editing the value and then pressing enter.

---
id: sandbox-plugin
title: Sandbox
---

The Sandbox plugin is useful for developers that had to test changes of their apps by pointing them to some Sandbox environment. Through this plugin and a few lines of code in the client,
the app can get a callback and get the value that the user has input through Sonar. At this point, the developer can plugin its logic to save this setting in its app.

## Setup

To use the sandbox plugin, you need to add the plugin to your Sonar client instance.

### Android

```java
import com.facebook.sonar.plugins.SandboxSonarPlugin;
import com.facebook.sonar.plugins.SandboxSonarPluginStrategy;

final SandboxSonarPluginStrategy strategy = getStrategy(); // Your strategy goes here
client.addPlugin(new SandboxSonarPlugin(strategy));
```

### iOS

Coming soon

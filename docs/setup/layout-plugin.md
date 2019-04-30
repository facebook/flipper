---
id: layout-plugin
title: Layout Inspector Setup
sidebar_label: Layout Inspector
---

To use the layout inspector plugin, you need to add the plugin to your Flipper client instance.

## Android

**Standard Android View Only**

```java
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;

final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();
client.addPlugin(new InspectorFlipperPlugin(mApplicationContext, descriptorMapping));
```

**With Litho Support**

If you want to enable Litho support in the layout inspector, you need to augment
the descriptor with Litho-specific settings and add some addition dependencies.

```java
import com.facebook.litho.config.ComponentsConfiguration;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.litho.LithoFlipperDescriptors;

// Instead of hard-coding this setting, it's a good practice to tie
// this to a BuildConfig flag, that you only enable for debug builds
// of your application.
ComponentsConfiguration.isDebugModeEnabled = true;

final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();
// This adds Litho capabilities to the layout inspector.
LithoFlipperDescriptors.add(descriptorMapping);

client.addPlugin(new InspectorFlipperPlugin(mApplicationContext, descriptorMapping));
```

You also need to compile in the `litho-annotations` package, as Flipper reflects
on them at runtime. So ensure to not just include them as `compileOnly` in your
gradle configuration:

```groovy
dependencies {
  debugImplementation 'com.facebook.litho:litho-annotations:0.19.0'
  // ...
}
```


### Blocking fullscreen views (Android only)

The issue is that if you have some view that occupies big part of the screen but draws nothing and its Z-position is higher than your main content, then selecting view/component through Layout Inspector doesn't work as you intended, as it will always hit that transparent view and you need to manually navigate to the view you need which is time-consuming and should not be necessary.

Add the following tag to your view to skip it from Flipper's view picker. The view will still be shown in the layout hierarchy, but it will not be selected while using the view picker.

```java
view.setTag("flipper_skip_view_traversal", true);
```


## iOS

<!--DOCUSAURUS_CODE_TABS-->
<!--Objective-C-->
```objective-c
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>

SKDescriptorMapper *mapper = [[SKDescriptorMapper alloc] initWithDefaults];
[client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:context.application withDescriptorMapper:mapper]]
```
<!--Swift-->
```swift
import FlipperKit

let layoutDescriptorMapper = SKDescriptorMapper(defaults: ())
// If you want to debug componentkit view in swift, otherwise you can ignore the next line
FlipperKitLayoutComponentKitSupport.setUpWith(layoutDescriptorMapper)

client?.add(FlipperKitLayoutPlugin(rootNode: application, with: layoutDescriptorMapper!))
```
<!--END_DOCUSAURUS_CODE_TABS-->

---
id: layout-plugin
title: Layout Inspector
---

The Layout Inspector in Sonar is useful for a ton of different debugging scenarios. First of all you can inspect what views the hierarchy is made up of as well as what properties each view has. This is incredibly useful when debugging issues with your product.

The Layout tab supports [Litho](https://fblitho.com) and [ComponentKit](https://componentkit.org) components as well! We integrate with these frameworks to present components in the hierarchy just as if they were native views. We show you all the layout properties, props, and state of the components. The layout inspector is further extensible to support other UI frameworks.

If you hover over a view or component in Sonar we will highlight the corresponding item in your app! This is perfect for debugging the bounds of your views and making sure you have the correct visual padding.

![Layout plugin](/docs/assets/layout.png)

## Setup

To use the layout inspector plugin, you need to add the plugin to your Sonar client instance.

### Android

```java
import com.facebook.sonar.plugins.inspector.DescriptorMapping;
import com.facebook.sonar.plugins.inspector.InspectorSonarPlugin;

final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();
client.addPlugin(new InspectorSonarPlugin(mApplicationContext, descriptorMapping));
```

### iOS

```objective-c
#import <SonarKitLayoutPlugin/SonarKitLayoutPlugin.h>
#import <SonarKitLayoutPlugin/SKDescriptorMapper.h>

SKDescriptorMapper *mapper = [[SKDescriptorMapper alloc] initWithDefaults];
[client addPlugin:[[SonarKitLayoutPlugin alloc] initWithRootNode:context.application withDescriptorMapper:mapper]]
```

## Quick edits

The Layout Inspector not only allows you to view the hierarchy and inspect each item's properties, but it also allows you to edit things such as layout attributes, background colors, props, and state. Most things actually! This allows you to quickly tweak paddings, margins, and colors until you are happy with them, all without re-compiling. This can save you many hours implementing a new design.

## Target mode

Enable target mode by clicking on the crosshairs icon. Now, you can touch any view on the device and Layout Inspector will jump to the correct position within your layout hierarchy.

### Blocking fullscreen views (Android only)

The issue is that if you have some view that occupies big part of the screen but draws nothing and its Z-position is higher than your main content, then selecting view/component through Layout Inspector doesn't work as you intended, as it will always hit that transparent view and you need to manually navigate to the view you need which is time-consuming and should not be necessary.

Add the following tag to your view to skip it from Sonar's view picker. The view will still be shown in the layout hierarchy, but it will not be selected while using the view picker.

```java
view.setTag("sonar_skip_view_traversal", true);
```

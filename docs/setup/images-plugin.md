---
id: images-plugin
title: Images Setup
sidebar_label: Images
---

Currently, the images plugin only supports [Fresco](https://frescolib.org/) for Android as backend, but just like the network plugin, support for other image loading libraries
could easily be added. Send us a PR!

## Fresco and Android

The Fresco images plugin is shipped as a separate Maven artifact:

```groovy
dependencies {
  debugImplementation 'com.facebook.flipper:flipper-fresco-plugin:0.30.1'
}
```

After including the plugin in your dependencies, you can add it to the
client:

```java
import com.facebook.flipper.plugins.fresco.FrescoFlipperPlugin;

client.addPlugin(new FrescoFlipperPlugin());
```

The `FrescoFlipperPlugin` constructor offers a whole lot of configuration options which
can be useful if you have an advanced setup of Fresco in your application:


```java
FrescoFlipperPlugin(
      DebugImageTracker imageTracker,
      PlatformBitmapFactory bitmapFactory,
      @Nullable FlipperObjectHelper flipperObjectHelper,
      DebugMemoryManager memoryManager,
      FlipperPerfLogger perfLogger,
      @Nullable FrescoFlipperDebugPrefHelper debugPrefHelper,
      @Nullable CloseableReferenceLeakTracker closeableReferenceLeakTracker) { ... }
```

### Leak Tracking

The Flipper plugin can help you track down `CloseableReferences` who have not had
`close()` called on them. This can have a negative impact on the performance of
your application.

To enable this functionality, you need to create a `CloseableReferenceLeakTracker`
and set it in both your `ImagePipelineConfig` for Fresco and the `FrescoPluginPlugin`
on creation.

```java
import com.facebook.imagepipeline.debug.FlipperCloseableReferenceLeakTracker;

// ...

FlipperCloseableReferenceLeakTracker leakTracker = new FlipperCloseableReferenceLeakTracker();

new ImagePipelineConfig.Builder()
    // ...
    .setCloseableReferenceLeakTracker(leakTracker)
    .build();


client.addPlugin(new FrescoFlipperPlugin(
    new FlipperImageTracker(),
    Fresco.getImagePipelineFactory().getPlatformBitmapFactory(),
    null,
    new NoOpDebugMemoryManager(),
    new NoOpFlipperPerfLogger(),
    null,
    leakTracker));
```

### Attribution

In order to annotate images with the context they are used in, you have to set a
caller context when loading the image. This can be any object, so for the simplest
case, a String will suffice.

```java
String callerContext = "my_feature";

// For DraweeViews:
draweeView.setImageURI(uri, callerContext);

// For prefetching:
ImagePipeline imagePipeline = Fresco.getImagePipeline();
imagePipeline.prefetchToDiskCache(imageRequest, callerContext);

// For manually fetching an image:
DataSource<CloseableReference<CloseableImage>>
    dataSource = imagePipeline.fetchDecodedImage(imageRequest, callerContext);
```

If a caller context is supplied, the image will be properly attributed in the
Flipper image plugin.

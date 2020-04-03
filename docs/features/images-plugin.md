---
id: images-plugin
title: Images
---

→ [See setup instructions for the images plugin](setup/images-plugin.md)

The images plugin allows you to inspect what images were fetched, where they are
coming from and selectively clear caches. Currently, the plugin supports
[Fresco](https://github.com/facebook/fresco/) as backend.

![Images plugin](assets/images-plugin.png)

## Cache Inspector

Images are grouped by the different caching layers they are stored in. The current
fill rate of the cache is shown and you can choose to selectively clear caches.


## Attribution

Images can be annotated with attributes that can help to determine the context in
which an image was loaded and displayed. You can use that information to filter
by a particular surface or only inspect images that are in the critical path
of your application, for instance during cold start.

## Leak Tracking

Dealing with large resources can require special APIs to be used that circumvent
usual garbage collection. The plugin allows tracking `CloseableReference`s for
Fresco on Android that weren't properly closed, which can help you improve
the performance of your app.
/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.plugins.fresco;

import android.graphics.Bitmap;
import android.util.Base64;
import com.facebook.cache.common.CacheKey;
import com.facebook.common.internal.Predicate;
import com.facebook.common.memory.manager.DebugMemoryManager;
import com.facebook.common.memory.manager.NoOpDebugMemoryManager;
import com.facebook.common.references.CloseableReference;
import com.facebook.common.references.SharedReference;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.drawee.backends.pipeline.info.ImageLoadStatus;
import com.facebook.drawee.backends.pipeline.info.ImageOriginUtils;
import com.facebook.drawee.backends.pipeline.info.ImagePerfData;
import com.facebook.drawee.backends.pipeline.info.ImagePerfDataListener;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.perflogger.FlipperPerfLogger;
import com.facebook.flipper.perflogger.NoOpFlipperPerfLogger;
import com.facebook.flipper.plugins.common.BufferingFlipperPlugin;
import com.facebook.flipper.plugins.fresco.objecthelper.FlipperObjectHelper;
import com.facebook.imagepipeline.bitmaps.PlatformBitmapFactory;
import com.facebook.imagepipeline.cache.CountingMemoryCacheInspector;
import com.facebook.imagepipeline.cache.CountingMemoryCacheInspector.DumpInfoEntry;
import com.facebook.imagepipeline.core.ImagePipelineFactory;
import com.facebook.imagepipeline.debug.CloseableReferenceLeakTracker;
import com.facebook.imagepipeline.debug.DebugImageTracker;
import com.facebook.imagepipeline.debug.FlipperImageTracker;
import com.facebook.imagepipeline.image.CloseableBitmap;
import com.facebook.imagepipeline.image.CloseableImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import javax.annotation.Nullable;

/**
 * Allows Sonar to display the contents of Fresco's caches. This is useful for developers to debug
 * what images are being held in cache as they navigate through their app.
 */
public class FrescoFlipperPlugin extends BufferingFlipperPlugin
    implements ImagePerfDataListener, CloseableReferenceLeakTracker.Listener {

  private static final String FRESCO_EVENT = "events";
  private static final String FRESCO_DEBUGOVERLAY_EVENT = "debug_overlay_event";
  private static final String FRESCO_CLOSEABLE_REFERENCE_LEAK_EVENT =
      "closeable_reference_leak_event";

  private static final int BITMAP_PREVIEW_WIDTH = 150;
  private static final int BITMAP_PREVIEW_HEIGHT = 150;
  private static final int BITMAP_SCALING_THRESHOLD_WIDTH = 200;
  private static final int BITMAP_SCALING_THRESHOLD_HEIGHT = 200;

  /** Helper for clearing cache. */
  private static final Predicate<CacheKey> ALWAYS_TRUE_PREDICATE =
      new Predicate<CacheKey>() {
        @Override
        public boolean apply(CacheKey cacheKey) {
          return true;
        }
      };

  private final FlipperImageTracker mFlipperImageTracker;
  private final PlatformBitmapFactory mPlatformBitmapFactory;
  @Nullable private final FlipperObjectHelper mSonarObjectHelper;
  private final DebugMemoryManager mMemoryManager;
  private final FlipperPerfLogger mPerfLogger;
  @Nullable private final FrescoFlipperDebugPrefHelper mDebugPrefHelper;
  private final List<FlipperObject> mEvents = new ArrayList<>();

  public FrescoFlipperPlugin(
      DebugImageTracker imageTracker,
      PlatformBitmapFactory bitmapFactory,
      @Nullable FlipperObjectHelper flipperObjectHelper,
      DebugMemoryManager memoryManager,
      FlipperPerfLogger perfLogger,
      @Nullable FrescoFlipperDebugPrefHelper debugPrefHelper,
      @Nullable CloseableReferenceLeakTracker closeableReferenceLeakTracker) {
    mFlipperImageTracker =
        imageTracker instanceof FlipperImageTracker
            ? (FlipperImageTracker) imageTracker
            : new FlipperImageTracker();
    mPlatformBitmapFactory = bitmapFactory;
    mSonarObjectHelper = flipperObjectHelper;
    mMemoryManager = memoryManager;
    mPerfLogger = perfLogger;
    mDebugPrefHelper = debugPrefHelper;

    if (closeableReferenceLeakTracker != null) {
      closeableReferenceLeakTracker.setListener(this);
    }
  }

  public FrescoFlipperPlugin() {
    this(
        new FlipperImageTracker(),
        Fresco.getImagePipelineFactory().getPlatformBitmapFactory(),
        null,
        new NoOpDebugMemoryManager(),
        new NoOpFlipperPerfLogger(),
        null,
        null);
  }

  public FlipperImageTracker getFlipperImageTracker() {
    return mFlipperImageTracker;
  }

  @Override
  public String getId() {
    return "Fresco";
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    super.onConnect(connection);
    connection.receive(
        "getAllImageData",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            if (!ensureFrescoInitialized(responder)) {
              return;
            }
            final ImagePipelineFactory imagePipelineFactory = Fresco.getImagePipelineFactory();
            final CountingMemoryCacheInspector.DumpInfo memoryCache =
                new CountingMemoryCacheInspector<>(
                        imagePipelineFactory.getBitmapCountingMemoryCache())
                    .dumpCacheContent();

            final FlipperArray memoryCacheSharedEntries =
                buildImageIdList(memoryCache.sharedEntries);
            final FlipperArray memoryCacheLRUEntries = buildImageIdList(memoryCache.lruEntries);
            final FlipperArray.Builder imageIDListBuilder = new FlipperArray.Builder();
            for (int i = 0; i < memoryCacheSharedEntries.length(); ++i) {
              final String imageID = memoryCacheSharedEntries.getString(i);
              imageIDListBuilder.put(imageID);
            }
            for (int i = 0; i < memoryCacheLRUEntries.length(); ++i) {
              final String imageID = memoryCacheLRUEntries.getString(i);
              imageIDListBuilder.put(imageID);
            }
            final FlipperArray imageIDs = imageIDListBuilder.build();
            final FlipperObject levels =
                getImageList(memoryCache, memoryCacheSharedEntries, memoryCacheLRUEntries);
            final FlipperArray.Builder imageDataListBuilder = new FlipperArray.Builder();

            for (int i = 0; i < imageIDs.length(); ++i) {
              final String imageID = imageIDs.getString(i);
              final CacheKey cacheKey = mFlipperImageTracker.getCacheKey(imageID);
              if (cacheKey == null) {
                continue;
              }
              final CloseableReference<CloseableImage> ref =
                  imagePipelineFactory.getBitmapCountingMemoryCache().get(cacheKey);
              if (ref == null) {
                continue;
              }
              final CloseableBitmap bitmap = (CloseableBitmap) ref.get();
              final String encodedBitmap =
                  bitmapToBase64Preview(bitmap.getUnderlyingBitmap(), mPlatformBitmapFactory);
              imageDataListBuilder.put(
                  getImageData(
                      imageID, encodedBitmap, bitmap, mFlipperImageTracker.getUriString(cacheKey)));
            }

            FlipperArray.Builder arrayBuilder = new FlipperArray.Builder();
            for (FlipperObject obj : mEvents) {
              arrayBuilder.put(obj);
            }
            mEvents.clear();

            FlipperObject object =
                new FlipperObject.Builder()
                    .put("levels", levels)
                    .put("imageDataList", imageDataListBuilder.build())
                    .put("events", arrayBuilder.build())
                    .build();
            responder.success(object);
          }
        });
    connection.receive(
        "listImages",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            if (!ensureFrescoInitialized(responder)) {
              return;
            }

            mPerfLogger.startMarker("Sonar.Fresco.listImages");
            final ImagePipelineFactory imagePipelineFactory = Fresco.getImagePipelineFactory();
            final CountingMemoryCacheInspector.DumpInfo memoryCache =
                new CountingMemoryCacheInspector<>(
                        imagePipelineFactory.getBitmapCountingMemoryCache())
                    .dumpCacheContent();
            responder.success(
                getImageList(
                    memoryCache,
                    buildImageIdList(memoryCache.sharedEntries),
                    buildImageIdList(memoryCache.lruEntries)));
            mPerfLogger.endMarker("Sonar.Fresco.listImages");
          }
        });

    connection.receive(
        "getImage",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, final FlipperResponder responder)
              throws Exception {
            if (!ensureFrescoInitialized(responder)) {
              return;
            }

            mPerfLogger.startMarker("Sonar.Fresco.getImage");
            String imageId = params.getString("imageId");
            CacheKey cacheKey = mFlipperImageTracker.getCacheKey(imageId);
            if (cacheKey == null) {
              respondError(responder, "ImageId " + imageId + " was evicted from cache");
              mPerfLogger.cancelMarker("Sonar.Fresco.getImage");
              return;
            }
            final ImagePipelineFactory imagePipelineFactory = Fresco.getImagePipelineFactory();
            CloseableReference<CloseableImage> ref =
                imagePipelineFactory.getBitmapCountingMemoryCache().get(cacheKey);
            if (ref == null) {
              respondError(responder, "no bitmap withId=" + imageId);
              mPerfLogger.cancelMarker("Sonar.Fresco.getImage");
              return;
            }
            final CloseableBitmap bitmap = (CloseableBitmap) ref.get();
            String encodedBitmap =
                bitmapToBase64Preview(bitmap.getUnderlyingBitmap(), mPlatformBitmapFactory);

            responder.success(
                getImageData(
                    imageId, encodedBitmap, bitmap, mFlipperImageTracker.getUriString(cacheKey)));

            mPerfLogger.endMarker("Sonar.Fresco.getImage");
          }
        });

    connection.receive(
        "clear",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            if (!ensureFrescoInitialized(responder)) {
              return;
            }

            mPerfLogger.startMarker("Sonar.Fresco.clear");
            final String type = params.getString("type");
            switch (type) {
              case "memory":
                final ImagePipelineFactory imagePipelineFactory = Fresco.getImagePipelineFactory();
                imagePipelineFactory.getBitmapMemoryCache().removeAll(ALWAYS_TRUE_PREDICATE);
                break;
              case "disk":
                Fresco.getImagePipeline().clearDiskCaches();
                break;
            }
            mPerfLogger.endMarker("Sonar.Fresco.clear");
          }
        });

    connection.receive(
        "trimMemory",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            if (!ensureFrescoInitialized(responder)) {
              return;
            }

            if (mMemoryManager != null) {
              mMemoryManager.trimMemory(
                  DebugMemoryManager.ON_SYSTEM_LOW_MEMORY_WHILE_APP_IN_FOREGROUND);
            }
          }
        });

    connection.receive(
        "enableDebugOverlay",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            if (!ensureFrescoInitialized(responder)) {
              return;
            }

            final boolean enabled = params.getBoolean("enabled");
            if (mDebugPrefHelper != null) {
              mDebugPrefHelper.setDebugOverlayEnabled(enabled);
            }
          }
        });

    if (mDebugPrefHelper != null) {
      mDebugPrefHelper.setDebugOverlayEnabledListener(
          new FrescoFlipperDebugPrefHelper.Listener() {
            @Override
            public void onEnabledStatusChanged(boolean enabled) {
              sendDebugOverlayEnabledEvent(enabled);
            }
          });
      sendDebugOverlayEnabledEvent(mDebugPrefHelper.isDebugOverlayEnabled());
    }
  }

  private FlipperObject getImageList(
      CountingMemoryCacheInspector.DumpInfo memoryCache,
      FlipperArray memoryCacheSharedEntries,
      FlipperArray memoryCacheLRUEntries) {
    return new FlipperObject.Builder()
        .put(
            "levels",
            new FlipperArray.Builder()
                .put(
                    new FlipperObject.Builder()
                        .put("cacheType", "On screen bitmaps")
                        .put("sizeBytes", memoryCache.size - memoryCache.lruSize)
                        .put("imageIds", memoryCacheSharedEntries)
                        .build())
                .put(
                    new FlipperObject.Builder()
                        .put("cacheType", "Bitmap memory cache")
                        .put("clearKey", "memory")
                        .put("sizeBytes", memoryCache.size)
                        .put("maxSizeBytes", memoryCache.maxSize)
                        .put("imageIds", memoryCacheLRUEntries)
                        .build())
                // TODO (t31947642): list images on disk
                .build())
        .build();
  }

  private FlipperObject getImageData(
      String imageID, String encodedBitmap, CloseableBitmap bitmap, String uriString) {
    return new FlipperObject.Builder()
        .put("imageId", imageID)
        .put("uri", uriString)
        .put("width", bitmap.getWidth())
        .put("height", bitmap.getHeight())
        .put("sizeBytes", bitmap.getSizeInBytes())
        .put("data", encodedBitmap)
        .build();
  }

  private boolean ensureFrescoInitialized(FlipperResponder responder) {
    mPerfLogger.startMarker("Sonar.Fresco.ensureFrescoInitialized");
    try {
      Fresco.getImagePipelineFactory();
      return true;
    } catch (NullPointerException e) {
      respondError(responder, "Fresco is not initialized yet");
      return false;
    } finally {
      mPerfLogger.endMarker("Sonar.Fresco.ensureFrescoInitialized");
    }
  }

  private FlipperArray buildImageIdList(List<DumpInfoEntry<CacheKey, CloseableImage>> images) {

    FlipperArray.Builder builder = new FlipperArray.Builder();
    for (DumpInfoEntry<CacheKey, CloseableImage> entry : images) {
      final FlipperImageTracker.ImageDebugData imageDebugData =
          mFlipperImageTracker.getImageDebugData(entry.key);

      if (imageDebugData == null) {
        builder.put(mFlipperImageTracker.trackImage(entry.key).getUniqueId());
      } else {
        builder.put(imageDebugData.getUniqueId());
      }
    }
    return builder.build();
  }

  private String bitmapToBase64Preview(Bitmap bitmap, PlatformBitmapFactory bitmapFactory) {
    if (bitmap.getWidth() < BITMAP_SCALING_THRESHOLD_WIDTH
        && bitmap.getHeight() < BITMAP_SCALING_THRESHOLD_HEIGHT) {
      return bitmapToBase64WithoutScaling(bitmap);
    }
    mPerfLogger.startMarker("Sonar.Fresco.bitmap2base64-resize");

    // TODO (t19034797): properly load images
    CloseableReference<Bitmap> scaledBitmapReference = null;
    try {
      float previewAspectRatio = BITMAP_PREVIEW_WIDTH / BITMAP_PREVIEW_HEIGHT;
      float imageAspectRatio = bitmap.getWidth() / bitmap.getHeight();

      int scaledWidth;
      int scaledHeight;
      if (previewAspectRatio > imageAspectRatio) {
        scaledWidth = bitmap.getWidth() * BITMAP_PREVIEW_HEIGHT / bitmap.getHeight();
        scaledHeight = BITMAP_PREVIEW_HEIGHT;
      } else {
        scaledWidth = BITMAP_PREVIEW_WIDTH;
        scaledHeight = bitmap.getHeight() * BITMAP_PREVIEW_WIDTH / bitmap.getWidth();
      }
      scaledBitmapReference =
          bitmapFactory.createScaledBitmap(bitmap, scaledWidth, scaledHeight, false);
      return bitmapToBase64WithoutScaling(scaledBitmapReference.get());
    } finally {
      CloseableReference.closeSafely(scaledBitmapReference);
      mPerfLogger.endMarker("Sonar.Fresco.bitmap2base64-resize");
    }
  }

  private String bitmapToBase64WithoutScaling(Bitmap bitmap) {
    mPerfLogger.startMarker("Sonar.Fresco.bitmap2base64-orig");
    ByteArrayOutputStream byteArrayOutputStream = null;
    try {
      byteArrayOutputStream = new ByteArrayOutputStream();
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);

      return "data:image/png;base64,"
          + Base64.encodeToString(byteArrayOutputStream.toByteArray(), Base64.DEFAULT);
    } finally {
      if (byteArrayOutputStream != null) {
        try {
          byteArrayOutputStream.close();
        } catch (IOException e) {
          // ignore
        }
      }
      mPerfLogger.endMarker("Sonar.Fresco.bitmap2base64-orig");
    }
  }

  public void onImageLoadStatusUpdated(
      ImagePerfData imagePerfData, @ImageLoadStatus int imageLoadStatus) {
    if (imageLoadStatus != ImageLoadStatus.SUCCESS) {
      return;
    }

    String requestId = imagePerfData.getRequestId();
    if (requestId == null) {
      return;
    }

    FlipperImageTracker.ImageDebugData data =
        mFlipperImageTracker.getDebugDataForRequestId(requestId);
    if (data == null) {
      return;
    }

    FlipperArray.Builder imageIdsBuilder = new FlipperArray.Builder();
    Set<CacheKey> cks = data.getCacheKeys();
    if (cks != null) {
      for (CacheKey ck : cks) {
        FlipperImageTracker.ImageDebugData d = mFlipperImageTracker.getImageDebugData(ck);
        if (d != null) {
          imageIdsBuilder.put(d.getUniqueId());
        }
      }
    } else {
      imageIdsBuilder.put(data.getUniqueId());
    }

    FlipperArray attribution;
    Object callerContext = imagePerfData.getCallerContext();
    if (callerContext == null) {
      attribution = new FlipperArray.Builder().put("unknown").build();
    } else if (mSonarObjectHelper == null) {
      attribution = new FlipperArray.Builder().put(callerContext.toString()).build();
    } else {
      attribution = mSonarObjectHelper.fromCallerContext(callerContext);
    }

    FlipperObject.Builder response =
        new FlipperObject.Builder()
            .put("imageIds", imageIdsBuilder.build())
            .put("attribution", attribution)
            .put("startTime", imagePerfData.getControllerSubmitTimeMs())
            .put("endTime", imagePerfData.getControllerFinalImageSetTimeMs())
            .put("source", ImageOriginUtils.toString(imagePerfData.getImageOrigin()));

    if (!imagePerfData.isPrefetch()) {
      response.put(
          "viewport",
          new FlipperObject.Builder()
              // TODO (t31947746): scan times
              .put("width", imagePerfData.getOnScreenWidthPx())
              .put("height", imagePerfData.getOnScreenHeightPx())
              .build());
    }
    FlipperObject responseObject = response.build();
    mEvents.add(responseObject);
    send(FRESCO_EVENT, responseObject);
  }

  public void onImageVisibilityUpdated(ImagePerfData imagePerfData, int visibilityState) {
    // ignored
  }

  public void sendDebugOverlayEnabledEvent(final boolean enabled) {
    final FlipperObject.Builder builder = new FlipperObject.Builder().put("enabled", enabled);
    send(FRESCO_DEBUGOVERLAY_EVENT, builder.build());
  }

  private static void respondError(FlipperResponder responder, String errorReason) {
    responder.error(new FlipperObject.Builder().put("reason", errorReason).build());
  }

  @Override
  public void onCloseableReferenceLeak(
      SharedReference<Object> reference, @Nullable Throwable stacktrace) {
    final FlipperObject.Builder builder =
        new FlipperObject.Builder()
            .put("identityHashCode", System.identityHashCode(reference))
            .put("className", reference.get().getClass().getName());
    if (stacktrace != null) {
      builder.put("stacktrace", getStackTraceString(stacktrace));
    }
    send(FRESCO_CLOSEABLE_REFERENCE_LEAK_EVENT, builder.build());
  }

  public static String getStackTraceString(Throwable tr) {
    StringWriter sw = new StringWriter();
    PrintWriter pw = new PrintWriter(sw);
    tr.printStackTrace(pw);
    return sw.toString();
  }
}

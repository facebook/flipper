/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.graphics.Canvas
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.PixelCopy
import android.view.View
import androidx.annotation.RequiresApi
import com.facebook.flipper.plugins.uidebugger.LogTag
import curtains.phoneWindow
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

interface Snapshotter {
  suspend fun takeSnapshot(view: View): BitmapPool.ReusableBitmap?
}

/**
 * Takes a snapshot by redrawing the view into a bitmap backed canvas, Since this is software
 * rendering there can be discrepancies between the real image and the snapshot:
 * 1. It can be unreliable when snapshotting views that are added directly to window manager
 * 2. It doesn't include certain types of content (video / images)
 */
class CanvasSnapshotter(private val bitmapPool: BitmapPool) : Snapshotter {
  override suspend fun takeSnapshot(view: View): BitmapPool.ReusableBitmap? {

    return SnapshotCommon.doSnapshotWithErrorHandling(bitmapPool, view, fallback = null) { bitmap ->
      val canvas = Canvas(bitmap.bitmap)
      view.draw(canvas)
      true
    }
  }
}

/**
 * Uses the new api to snapshot any view regardless whether its attached to a activity or not,
 * requires no hacks
 */
@RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
class ModernPixelCopySnapshotter(
    private val bitmapPool: BitmapPool,
    private val fallback: Snapshotter
) : Snapshotter {
  private var handler = Handler(Looper.getMainLooper())

  override suspend fun takeSnapshot(view: View): BitmapPool.ReusableBitmap? {

    return if (view.isHardwareAccelerated) {
      SnapshotCommon.doSnapshotWithErrorHandling(bitmapPool, view, fallback) { reusableBitmap ->
        suspendCoroutine { continuation ->
          // Since android U this api is actually async
          val request =
              PixelCopy.Request.Builder.ofWindow(view)
                  .setDestinationBitmap(reusableBitmap.bitmap)
                  .build()
          PixelCopy.request(
              request,
              { handler.post(it) },
              { continuation.resume(it.status == PixelCopy.SUCCESS) })
        }
      }
    } else {
      fallback.takeSnapshot(view)
    }
  }
}

/**
 * Uses pixel copy api to do a snapshot, this is accurate but prior to android U we have to use a
 * bit of hack to get the surface for root views not associated to an activity (added directly to
 * the window manager)
 */
@RequiresApi(Build.VERSION_CODES.O)
class PixelCopySnapshotter(
    private val bitmapPool: BitmapPool,
    private val applicationRef: ApplicationRef,
    private val fallback: Snapshotter
) : Snapshotter {
  private var handler = Handler(Looper.getMainLooper())

  override suspend fun takeSnapshot(view: View): BitmapPool.ReusableBitmap? {

    return if (view.isHardwareAccelerated) {
      SnapshotCommon.doSnapshotWithErrorHandling(bitmapPool, view, fallback) {
        tryCopyViaPhoneWindow(view, it) || tryCopyViaInternalSurface(view, it)
      }
    } else {
      fallback.takeSnapshot(view)
    }
  }

  /**
   * This is the preferred method, passing a window into pixel copy correctly accounts for the
   * surface insets, this means dialog fragments are snapshotted correctly
   */
  private suspend fun tryCopyViaPhoneWindow(
      view: View,
      bitmap: BitmapPool.ReusableBitmap
  ): Boolean {

    val window = view.phoneWindow ?: return false

    return suspendCoroutine { continuation ->
      PixelCopy.request(window, bitmap.bitmap, pixelCopyCallback(continuation), handler)
    }
  }

  private suspend fun tryCopyViaInternalSurface(
      view: View,
      bitmap: BitmapPool.ReusableBitmap
  ): Boolean {
    val surface = applicationRef.windowManagerUtility.surfaceForRootView(view) ?: return false

    return suspendCoroutine { continuation ->
      PixelCopy.request(surface, bitmap.bitmap, pixelCopyCallback(continuation), handler)
    }
  }

  private fun pixelCopyCallback(continuation: Continuation<Boolean>): (Int) -> Unit =
      { result: Int ->
        if (result == PixelCopy.SUCCESS) {
          continuation.resume(true)
        } else {
          Log.w(LogTag, "Pixel copy failed, code $result")
          continuation.resume(false)
        }
      }
}

internal object SnapshotCommon {

  internal suspend fun doSnapshotWithErrorHandling(
      bitmapPool: BitmapPool,
      view: View,
      fallback: Snapshotter?,
      snapshotStrategy: suspend (reuseableBitmap: BitmapPool.ReusableBitmap) -> Boolean
  ): BitmapPool.ReusableBitmap? {
    if (view.width <= 0 || view.height <= 0) {
      return null
    }
    var reusableBitmap: BitmapPool.ReusableBitmap? = null
    try {
      reusableBitmap = bitmapPool.getBitmap(view.width, view.height)
      if (snapshotStrategy(reusableBitmap)) {
        return reusableBitmap
      }
    } catch (e: OutOfMemoryError) {
      Log.e(LogTag, "OOM when taking snapshot")
    } catch (e: Exception) {
      // there was some problem with the pixel copy, fall back to canvas impl
      Log.e(LogTag, "Exception when taking snapshot", e)
    }

    // something went wrong, use fallback, make sure to give bitmap back to pool first
    Log.d(LogTag, "Using fallback snapshot method")
    reusableBitmap?.readyForReuse()
    return fallback?.takeSnapshot(view)
  }
}

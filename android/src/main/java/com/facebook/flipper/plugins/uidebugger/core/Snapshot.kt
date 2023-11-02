/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Activity
import android.graphics.Canvas
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.PixelCopy
import android.view.View
import androidx.annotation.RequiresApi
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool

interface Snapshotter {
  fun takeSnapshot(view: View): BitmapPool.ReusableBitmap?
}

/**
 * Takes a snapshot by redrawing the view into a bitmap backed canvas, Since this is software
 * rendering there can be discrepancies between the real image and the snapshot:
 * 1. It can be unreliable when snapshotting views that are added directly to window manager
 * 2. It doesnt include certain types of content (video / images)
 */
class CanvasSnapshotter(private val bitmapPool: BitmapPool) : Snapshotter {
  override fun takeSnapshot(view: View): BitmapPool.ReusableBitmap? {

    if (view.width <= 0 || view.height <= 0) {
      return null
    }

    return try {
      val reuseAbleBitmap = bitmapPool.getBitmap(view.width, view.height)
      val canvas = Canvas(reuseAbleBitmap.bitmap)
      view.draw(canvas)
      reuseAbleBitmap
    } catch (e: OutOfMemoryError) {
      Log.e(LogTag, "OOM when taking snapshot")
      null
    }
  }
}

@RequiresApi(Build.VERSION_CODES.O)
class PixelCopySnapshotter(
    private val bitmapPool: BitmapPool,
    private val applicationRef: ApplicationRef,
    private val fallback: Snapshotter
) : Snapshotter {

  override fun takeSnapshot(view: View): BitmapPool.ReusableBitmap? {

    if (view.width <= 0 || view.height <= 0) {
      return null
    }

    val bitmap = bitmapPool.getBitmap(view.width, view.height)
    try {

      val decorViewToActivity: Map<View, Activity> =
          applicationRef.activitiesStack.toList().associateBy { it.window.decorView }

      val activity = decorViewToActivity[view]

      // if this view belongs to an activity prefer this as it doesn't require private api hacks
      if (activity != null) {
        PixelCopy.request(
            activity.window,
            bitmap.bitmap,
            {
              // no-op this this api is actually synchronous despite how it looks
            },
            Handler(Looper.getMainLooper()))
        return bitmap
      }
    } catch (e: OutOfMemoryError) {
      Log.e(LogTag, "OOM when taking snapshot")
      null
    } catch (e: Exception) {
      // there was some problem with the pixel copy, fall back to canvas impl
      Log.e(LogTag, "Exception when taking snapshot", e)
      Log.i(LogTag, "Using fallback snapshot", e)
      bitmap.readyForReuse()
      fallback.takeSnapshot(view)
    }

    return null
  }
}

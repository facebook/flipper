/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.graphics.Canvas
import android.util.Log
import android.view.View
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

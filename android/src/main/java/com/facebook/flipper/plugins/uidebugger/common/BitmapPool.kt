/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.common

import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper

class BitmapPool(
    private val width: Int,
    private val height: Int,
    private val config: Bitmap.Config = Bitmap.Config.RGB_565
) {

  interface RecyclableBitmap {
    val bitmap: Bitmap?
    fun recycle()
  }

  private var handler: Handler = Handler(Looper.getMainLooper())

  private val bitmaps: MutableList<Bitmap> = mutableListOf()
  private var isRecycled = false

  fun recycle() {
    isRecycled = true
    bitmaps.forEach { bitmap -> bitmap.recycle() }
    bitmaps.clear()
  }

  fun getBitmap(): RecyclableBitmap {
    return if (bitmaps.isEmpty()) {
      LeasedBitmap(Bitmap.createBitmap(width, height, config))
    } else {
      LeasedBitmap(bitmaps.removeLast())
    }
  }

  inner class LeasedBitmap(override val bitmap: Bitmap) : RecyclableBitmap {
    override fun recycle() {
      handler.post {
        if (isRecycled) {
          bitmap.recycle()
        } else {
          bitmaps.add(bitmap)
        }
      }
    }
  }

  companion object {
    fun createBitmap(width: Int, height: Int, config: Bitmap.Config): Bitmap {
      return Bitmap.createBitmap(width, height, config)
    }

    fun createBitmapWithDefaultConfig(width: Int, height: Int): Bitmap {
      return Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
    }
  }
}

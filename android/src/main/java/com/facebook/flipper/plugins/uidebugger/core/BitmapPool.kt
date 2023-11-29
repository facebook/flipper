/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.graphics.Bitmap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

/** BitmapPool is intended to be used on the main thread. In other words, it is not thread-safe. */
class BitmapPool(private val config: Bitmap.Config = Bitmap.Config.RGB_565) {

  interface ReusableBitmap {
    val bitmap: Bitmap

    fun readyForReuse()
  }

  val mainScope = CoroutineScope(Dispatchers.Main)

  private val container: MutableMap<String, MutableList<Bitmap>> = mutableMapOf()
  private var isRecycled = false

  private fun generateKey(width: Int, height: Int): String = "$width,$height"

  fun recycleAll() {
    isRecycled = true
    container.forEach { (_, bitmaps) ->
      bitmaps.forEach { bitmap -> bitmap.recycle() }
      bitmaps.clear()
    }

    container.clear()
  }

  fun makeReady() {
    isRecycled = false
  }

  fun getBitmap(width: Int, height: Int): ReusableBitmap {
    val key = generateKey(width, height)
    val bitmaps = container[key]

    return if (bitmaps == null || bitmaps.isEmpty()) {
      LeasedBitmap(Bitmap.createBitmap(width, height, config))
    } else {
      LeasedBitmap(bitmaps.removeLast())
    }
  }

  inner class LeasedBitmap(override val bitmap: Bitmap) : ReusableBitmap {
    override fun readyForReuse() {
      val key = generateKey(bitmap.width, bitmap.height)

      synchronized(this@BitmapPool) {
        if (isRecycled) {
          bitmap.recycle()
        } else {
          var bitmaps = container[key]
          if (bitmaps == null) {
            bitmaps = mutableListOf()
            container[key] = bitmaps
          }
          bitmaps.add(bitmap)
        }
      }
    }
  }

  companion object {
    fun createBitmapWithDefaultConfig(width: Int, height: Int): Bitmap {
      return Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
    }
  }
}

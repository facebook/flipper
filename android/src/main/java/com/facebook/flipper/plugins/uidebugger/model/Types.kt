/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import android.graphics.Rect
import kotlinx.serialization.Serializable

@kotlinx.serialization.Serializable
data class Bounds(val x: Int, val y: Int, val width: Int, val height: Int) {
  companion object {
    fun fromRect(rect: Rect): Bounds {
      return Bounds(rect.left, rect.top, rect.width(), rect.height())
    }
  }
}

@kotlinx.serialization.Serializable
data class SpaceBox(val top: Int, val right: Int, val bottom: Int, val left: Int) {
  companion object {
    fun fromRect(rect: Rect): SpaceBox {
      return SpaceBox(rect.top, rect.right, rect.bottom, rect.left)
    }
  }
}

@kotlinx.serialization.Serializable
data class Color(val r: Int, val g: Int, val b: Int, val a: Int) {
  companion object {
    fun fromColor(color: Int): Color {
      val alpha: Int = (color shr 24) and 0xFF / 255
      val red: Int = (color shr 16) and 0xFF
      val green: Int = (color shr 8) and 0xFF
      val blue: Int = (color shr 0) and 0xFF
      return Color(red, green, blue, alpha)
    }
    fun fromColor(color: android.graphics.Color): Color {
      return fromColor(color.toArgb())
    }
  }
}

@kotlinx.serialization.Serializable
data class Coordinate(
    @Serializable(with = NumberSerializer::class) val x: Number,
    @Serializable(with = NumberSerializer::class) val y: Number
) {}

@kotlinx.serialization.Serializable
data class Coordinate3D(
    @Serializable(with = NumberSerializer::class) val x: Number,
    @Serializable(with = NumberSerializer::class) val y: Number,
    @Serializable(with = NumberSerializer::class) val z: Number
) {}

@kotlinx.serialization.Serializable
data class Size(
    @Serializable(with = NumberSerializer::class) val width: Number,
    @Serializable(with = NumberSerializer::class) val height: Number
) {}

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

import com.facebook.flipper.core.FlipperDynamic
import kotlin.math.roundToInt

object ColorUtil {
  fun toColorInt(value: FlipperDynamic): Int =
      android.graphics.Color.argb(
          (value.asObject().getFloat("a") * 255).roundToInt(),
          value.asObject().getInt("r"),
          value.asObject().getInt("g"),
          value.asObject().getInt("b"),
      )
}

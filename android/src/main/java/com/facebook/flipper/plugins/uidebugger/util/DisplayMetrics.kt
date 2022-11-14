/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

import android.content.res.Resources
import com.facebook.flipper.plugins.uidebugger.model.Bounds

object DisplayMetrics {
  fun getDisplayBounds(): Bounds {
    val displayMetrics = Resources.getSystem().displayMetrics
    return Bounds(0, 0, displayMetrics.widthPixels, displayMetrics.heightPixels)
  }
}

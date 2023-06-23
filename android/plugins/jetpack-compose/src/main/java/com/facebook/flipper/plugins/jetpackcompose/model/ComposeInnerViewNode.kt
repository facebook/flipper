// (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.

package com.facebook.flipper.plugins.jetpackcompose.model

import android.view.View
import com.facebook.flipper.plugins.uidebugger.model.Bounds

class ComposeInnerViewNode(
    val view: View,
) {
  val bounds: Bounds = Bounds(0, 0, view.width, view.height)
}

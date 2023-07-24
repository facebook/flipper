/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose.model

import android.view.View
import com.facebook.flipper.plugins.uidebugger.model.Bounds

class ComposeInnerViewNode(
    val view: View,
) {
  val bounds: Bounds = Bounds(0, 0, view.width, view.height)
}

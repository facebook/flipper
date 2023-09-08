/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import com.facebook.flipper.plugins.uidebugger.descriptors.ChainedDescriptor
import com.facebook.litho.MatrixDrawable

object MatrixDrawableDescriptor : ChainedDescriptor<MatrixDrawable<*>>() {

  override fun onGetChildren(node: MatrixDrawable<*>): List<Any>? {
    val mountedDrawable = node.mountedDrawable
    return if (mountedDrawable != null) {
      listOf(mountedDrawable)
    } else {
      listOf()
    }
  }

  override fun onGetName(node: MatrixDrawable<*>): String = node.javaClass.simpleName
}

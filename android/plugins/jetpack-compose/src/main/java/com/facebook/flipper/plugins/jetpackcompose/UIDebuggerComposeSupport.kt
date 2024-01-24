/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose

import android.os.Build
import android.util.Log
import androidx.compose.ui.platform.ComposeView
import com.facebook.flipper.plugins.jetpackcompose.descriptors.ComposeInnerViewDescriptor
import com.facebook.flipper.plugins.jetpackcompose.descriptors.ComposeNodeDescriptor
import com.facebook.flipper.plugins.jetpackcompose.descriptors.ComposeViewDescriptor
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeInnerViewNode
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeNode
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.soloader.SoLoader

const val JetpackComposeTag = "Compose"

object UIDebuggerComposeSupport {

  init {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      try {
        SoLoader.loadLibrary("art_tooling")
      } catch (t: Throwable) {
        Log.e("UIDebuggerCompose", "Failed to load native library.", t)
      }
    }
  }

  fun enable(context: UIDContext) {
    addDescriptors(context.descriptorRegister)
  }

  private fun addDescriptors(register: DescriptorRegister) {
    register.register(ComposeView::class.java, ComposeViewDescriptor)
    register.register(ComposeNode::class.java, ComposeNodeDescriptor)
    register.register(ComposeInnerViewNode::class.java, ComposeInnerViewDescriptor)
  }
}

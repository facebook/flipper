/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose

import android.os.Build
import android.util.Log
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.isDebugInspectorInfoEnabled
import com.facebook.flipper.plugins.jetpackcompose.descriptors.AbstractComposeViewDescriptor
import com.facebook.flipper.plugins.jetpackcompose.descriptors.ComposeInnerViewDescriptor
import com.facebook.flipper.plugins.jetpackcompose.descriptors.ComposeNodeDescriptor
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeInnerViewNode
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeNode
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.soloader.SoLoader

const val JetpackComposeTag = "Compose"

object UIDebuggerComposeSupport {

  private const val TAG = "UIDebuggerCompose"

  init {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      try {
        SoLoader.loadLibrary("art_tooling")
      } catch (t: Throwable) {
        Log.e(TAG, "Failed to load native library.", t)
      }
      enableDebugInspectorInfo()
    }
  }

  fun enable(context: UIDContext) {
    addDescriptors(context.descriptorRegister)
  }

  private fun addDescriptors(register: DescriptorRegister) {
    register.register(AbstractComposeView::class.java, AbstractComposeViewDescriptor)
    register.register(ComposeNode::class.java, ComposeNodeDescriptor)
    register.register(ComposeInnerViewNode::class.java, ComposeInnerViewDescriptor)
  }

  private fun enableDebugInspectorInfo() {
    // Set isDebugInspectorInfoEnabled to true via reflection such that Redex and R8 cannot see the
    // assignment. This allows the InspectorInfo lambdas to be stripped from release builds.
    if (!isDebugInspectorInfoEnabled) {
      try {
        val packageClass = Class.forName("androidx.compose.ui.platform.InspectableValueKt")
        val field = packageClass.getDeclaredField("isDebugInspectorInfoEnabled")
        field.isAccessible = true
        field.setBoolean(null, true)
      } catch (ex: Exception) {
        Log.e(TAG, "Could not access isDebugInspectorInfoEnabled.", ex)
      }
    }
  }
}

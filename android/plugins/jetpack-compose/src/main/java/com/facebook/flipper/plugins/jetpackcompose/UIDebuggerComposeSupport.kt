// (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.

package com.facebook.flipper.plugins.jetpackcompose

import androidx.compose.ui.platform.ComposeView
import com.facebook.flipper.plugins.jetpackcompose.descriptors.*
import com.facebook.flipper.plugins.jetpackcompose.model.*
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister

const val JetpackComposeTag = "JetpackCompose"

object UIDebuggerComposeSupport {

  fun enable(context: UIDContext) {
    addDescriptors(context.descriptorRegister)
  }

  private fun addDescriptors(register: DescriptorRegister) {
    register.register(ComposeView::class.java, ComposeViewDescriptor)
    register.register(ComposeNode::class.java, ComposeNodeDescriptor)
    register.register(ComposeInnerViewNode::class.java, ComposeInnerViewDescriptor)
  }
}

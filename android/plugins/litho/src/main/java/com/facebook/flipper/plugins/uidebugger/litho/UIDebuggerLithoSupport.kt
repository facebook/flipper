/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.litho.descriptors.*
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView
import com.facebook.litho.MatrixDrawable
import com.facebook.litho.widget.TextDrawable

const val LithoTag = "Litho"

object UIDebuggerLithoSupport {

  fun addDescriptors(register: DescriptorRegister) {
    register.register(LithoView::class.java, LithoViewDescriptor)
    register.register(DebugComponent::class.java, DebugComponentDescriptor(register))
    register.register(TextDrawable::class.java, TextDrawableDescriptor)
    register.register(MatrixDrawable::class.java, MatrixDrawableDescriptor)
  }

  fun addObserver(observerFactory: TreeObserverFactory) {
    observerFactory.register(LithoViewTreeObserverBuilder)
  }
}

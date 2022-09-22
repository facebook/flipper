/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView

object UIDebuggerLithoSupport {

  fun addDescriptors(register: DescriptorRegister) {
    register.register(LithoView::class.java, LithoViewDescriptor)
    register.register(MountedObject::class.java, MountedObjectDescriptor)
    register.register(DebugComponent::class.java, DebugComponentDescriptor(register))
  }

  fun addObserver(observerFactory: TreeObserverFactory) {
    observerFactory.register(LithoViewTreeObserverBuilder)
  }
}

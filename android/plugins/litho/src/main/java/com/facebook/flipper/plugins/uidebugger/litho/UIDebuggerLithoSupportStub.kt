/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory

// this is not used internally
object UIDebuggerLithoSupport {

  fun addDescriptors(register: DescriptorRegister) {}

  fun addObserver(observerFactory: TreeObserverFactory) {}
}

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.view.Window
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

class WindowDescriptor : AbstractChainedDescriptor<Window>() {

  override fun onGetId(window: Window): String {
    return Integer.toString(System.identityHashCode(window))
  }

  override fun onGetName(window: Window): String {
    return window.javaClass.simpleName
  }

  override fun onGetChildren(window: Window, children: MutableList<Any>) {
    children.add(window.decorView)
  }

  override fun onGetData(
      window: Window,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}

  override fun onGetActiveChild(node: Window): Any? {
    return null
  }
}

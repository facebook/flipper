/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.view.Window

object WindowDescriptor : ChainedDescriptor<Window>() {

  override fun onGetName(node: Window): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: Window, children: MutableList<Any>) {
    children.add(node.decorView)
  }
}

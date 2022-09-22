/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

object FragmentFrameworkDescriptor : ChainedDescriptor<android.app.Fragment>() {

  override fun onGetName(node: android.app.Fragment): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: android.app.Fragment, children: MutableList<Any>) {
    node.view?.let { view -> children.add(view) }
  }

  override fun onGetData(
      node: android.app.Fragment,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}
}

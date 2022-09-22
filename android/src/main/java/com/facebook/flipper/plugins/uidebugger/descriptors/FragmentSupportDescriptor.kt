/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

object FragmentSupportDescriptor : ChainedDescriptor<androidx.fragment.app.Fragment>() {

  override fun onGetName(node: androidx.fragment.app.Fragment): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: androidx.fragment.app.Fragment, children: MutableList<Any>) {
    node.view?.let { view -> children.add(view) }
  }

  override fun onGetData(
      node: androidx.fragment.app.Fragment,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}
}

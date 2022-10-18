/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue

object FragmentSupportDescriptor : ChainedDescriptor<androidx.fragment.app.Fragment>() {

  override fun onGetName(node: androidx.fragment.app.Fragment): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: androidx.fragment.app.Fragment): List<Any> =
      node.view?.let { view -> listOf(view) } ?: listOf()

  override fun onGetData(
      node: androidx.fragment.app.Fragment,
      attributeSections: MutableMap<String, InspectableObject>
  ) {
    val args = node.arguments
    args?.let { bundle ->
      val props = mutableMapOf<String, Inspectable>()
      for (key in bundle.keySet()) {
        when (val value = bundle[key]) {
          is Number -> props[key] = InspectableValue.Number(value)
          is Boolean -> props[key] = InspectableValue.Boolean(value)
          is String -> props[key] = InspectableValue.Text(value)
        }
      }
      attributeSections["Fragment"] = InspectableObject(props.toMap())
    }
  }
}

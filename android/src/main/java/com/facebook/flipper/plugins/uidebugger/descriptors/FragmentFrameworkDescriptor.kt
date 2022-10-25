/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.os.Bundle
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue

object FragmentFrameworkDescriptor : ChainedDescriptor<android.app.Fragment>() {

  override fun onGetName(node: android.app.Fragment): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: android.app.Fragment): List<Any> =
      node.view?.let { view -> listOf(view) } ?: listOf()

  override fun onGetData(
      node: android.app.Fragment,
      attributeSections: MutableMap<String, InspectableObject>
  ) {
    val args: Bundle = node.arguments

    val props = mutableMapOf<String, Inspectable>()
    for (key in args.keySet()) {
      when (val value = args[key]) {
        is Number -> props[key] = InspectableValue.Number(value)
        is Boolean -> props[key] = InspectableValue.Boolean(value)
        is String -> props[key] = InspectableValue.Text(value)
      }
    }

    attributeSections["Fragment"] = InspectableObject(props.toMap())
  }
}

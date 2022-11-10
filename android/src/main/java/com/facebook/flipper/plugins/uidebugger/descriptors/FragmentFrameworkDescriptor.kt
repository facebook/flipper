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
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

object FragmentFrameworkDescriptor : ChainedDescriptor<android.app.Fragment>() {

  private const val NAMESPACE = "Fragment"
  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)

  override fun onGetName(node: android.app.Fragment): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: android.app.Fragment): List<Any> =
      node.view?.let { view -> listOf(view) } ?: listOf()

  override fun onGetData(
      node: android.app.Fragment,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    val args: Bundle = node.arguments

    val props = mutableMapOf<Int, Inspectable>()
    for (key in args.keySet()) {
      val metadata = MetadataRegister.get(NAMESPACE, key)
      val identifier =
          metadata?.id
              ?: MetadataRegister.registerDynamic(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, key)

      when (val value = args[key]) {
        is Number -> props[identifier] = InspectableValue.Number(value)
        is Boolean -> props[identifier] = InspectableValue.Boolean(value)
        is String -> props[identifier] = InspectableValue.Text(value)
      }
    }

    attributeSections[SectionId] = InspectableObject(props.toMap())
  }
}

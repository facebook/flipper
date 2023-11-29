/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import androidx.fragment.app.Fragment
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

class FragmentSupportDescriptor(val register: DescriptorRegister) :
    ChainedDescriptor<androidx.fragment.app.Fragment>() {

  private val NAMESPACE = "Fragment"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)

  private var IsInLayout =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isInLayout")

  private var IsAdded =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isAdded")
  private var IsDetatched =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isDetached")
  private var IsHidden =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isHidden")
  private var IsVisible =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isVisible")

  private var IsResumed =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isResumed")

  private var IsMenuVisible =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isMenuVisible")

  private var Arguements =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "arguements")

  override fun onGetName(node: androidx.fragment.app.Fragment): String {
    return node.javaClass.simpleName
  }

  override fun onGetBounds(node: Fragment): Bounds {
    return node.view?.let {
      val descriptor = register.descriptorForClassUnsafe(it.javaClass)
      return descriptor.getBounds(it)
    } ?: Bounds(0, 0, 0, 0)
  }

  override fun onGetChildren(node: androidx.fragment.app.Fragment): List<Any> {
    val view = node.view
    return if (view != null && node.isVisible) {
      listOf(OffsetChild.zero(view, register.descriptorForClassUnsafe(view.javaClass)))
    } else {
      listOf()
    }
  }

  override fun onGetAttributes(
      node: androidx.fragment.app.Fragment,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {

    val props = mutableMapOf<Int, Inspectable>()

    props[IsInLayout] = InspectableValue.Boolean(node.isInLayout)
    props[IsAdded] = InspectableValue.Boolean(node.isAdded)
    props[IsDetatched] = InspectableValue.Boolean(node.isDetached)
    props[IsHidden] = InspectableValue.Boolean(node.isHidden)
    props[IsVisible] = InspectableValue.Boolean(node.isVisible)
    props[IsResumed] = InspectableValue.Boolean(node.isResumed)
    props[IsMenuVisible] = InspectableValue.Boolean(node.isMenuVisible)

    val arguements = mutableMapOf<MetadataId, Inspectable>()
    val args = node.arguments
    args?.let { bundle ->
      for (key in bundle.keySet()) {
        val metadata = MetadataRegister.get(NAMESPACE, key)
        val identifier =
            metadata?.id
                ?: MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, key)
        when (val value = bundle[key]) {
          is Number -> arguements[identifier] = InspectableValue.Number(value)
          is Boolean -> arguements[identifier] = InspectableValue.Boolean(value)
          is String -> arguements[identifier] = InspectableValue.Text(value)
        }
      }
    }
    if (arguements.size > 0) {
      props[Arguements] = InspectableObject(arguements)
    }
    attributeSections[SectionId] = InspectableObject(props)
  }
}

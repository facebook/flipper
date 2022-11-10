/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import androidx.viewpager.widget.ViewPager
import com.facebook.flipper.plugins.uidebugger.core.FragmentTracker
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

object ViewPagerDescriptor : ChainedDescriptor<ViewPager>() {

  private const val NAMESPACE = "ViewPager"
  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  override fun onGetName(node: ViewPager): String = node.javaClass.simpleName

  override fun onGetActiveChild(node: ViewPager): Any? {
    val child = node.getChildAt(node.currentItem)
    val fragment = FragmentTracker.getFragment(child)
    if (fragment != null) {
      return fragment
    }
    return child
  }

  private val CurrentItemIndexAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "currentItemIndex")
  override fun onGetData(
      node: ViewPager,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    val props =
        InspectableObject(
            mapOf(CurrentItemIndexAttributeId to InspectableValue.Number(node.currentItem)))

    attributeSections[SectionId] = props
  }
}

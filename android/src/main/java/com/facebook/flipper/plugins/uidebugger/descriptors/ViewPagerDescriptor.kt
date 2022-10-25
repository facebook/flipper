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

object ViewPagerDescriptor : ChainedDescriptor<ViewPager>() {

  override fun onGetName(node: ViewPager): String = node.javaClass.simpleName

  override fun onGetActiveChild(node: ViewPager): Any? {
    val child = node.getChildAt(node.currentItem)
    val fragment = FragmentTracker.getFragment(child)
    if (fragment != null) {
      return fragment
    }
    return child
  }

  override fun onGetData(
      node: ViewPager,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {
    val props =
        InspectableObject(
            mapOf("currentItemIndex" to InspectableValue.Number(node.currentItem, false)))

    attributeSections["ViewPager"] = props
  }
}

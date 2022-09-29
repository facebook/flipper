/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.drawable.Drawable
import android.os.Build
import com.facebook.flipper.plugins.uidebugger.common.Inspectable
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.Bounds

object DrawableDescriptor : ChainedDescriptor<Drawable>() {
  override fun onGetName(node: Drawable): String = node.javaClass.simpleName

  override fun onGetBounds(node: Drawable): Bounds =
      Bounds(node.bounds.left, node.bounds.top, node.bounds.width(), node.bounds.height())

  override fun onGetData(
      node: Drawable,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {
    val props = mutableMapOf<String, Inspectable>()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
      props.put("alpha", InspectableValue.Number(node.getAlpha(), true))
    }

    attributeSections["Drawable"] = InspectableObject(props.toMap())
  }

  override fun onGetTags(node: Drawable): Set<String> = BaseTags.NativeAndroid
}

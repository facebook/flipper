/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.drawable.ColorDrawable
import com.facebook.flipper.plugins.uidebugger.model.Color
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue

object ColorDrawableDescriptor : ChainedDescriptor<ColorDrawable>() {

  override fun onGetName(node: ColorDrawable): String = node.javaClass.simpleName

  override fun onGetData(
      node: ColorDrawable,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {
    val props = mutableMapOf<String, Inspectable>()
    props["color"] = InspectableValue.Color(Color.fromColor(node.color), mutable = true)

    attributeSections["ColorDrawable"] = InspectableObject(props.toMap())
  }
}

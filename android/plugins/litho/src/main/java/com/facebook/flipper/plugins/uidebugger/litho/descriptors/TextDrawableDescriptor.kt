/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import com.facebook.flipper.plugins.uidebugger.descriptors.ChainedDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.SectionName
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.litho.widget.TextDrawable

object TextDrawableDescriptor : ChainedDescriptor<TextDrawable>() {
  override fun onGetName(node: TextDrawable): String = node.javaClass.simpleName

  override fun onGetData(
      node: TextDrawable,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {

    val props =
        mapOf<String, Inspectable>("text" to InspectableValue.Text(node.text.toString(), false))

    attributeSections["TextDrawable"] = InspectableObject(props)
  }
}

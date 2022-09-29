/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.drawable.ColorDrawable
import android.os.Build
import com.facebook.flipper.plugins.uidebugger.common.Inspectable
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue

object ColorDrawableDescriptor : ChainedDescriptor<ColorDrawable>() {

  override fun onGetName(node: ColorDrawable): String = node.javaClass.simpleName

  override fun onGetData(
      node: ColorDrawable,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {
    val props = mutableMapOf<String, Inspectable>()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
      props.put("color", InspectableValue.Color(node.color, mutable = true))
    }

    attributeSections["ColorDrawable"] = InspectableObject(props.toMap())
  }
}

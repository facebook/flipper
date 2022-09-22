/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.widget.TextView
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

object TextViewDescriptor : ChainedDescriptor<TextView>() {

  override fun onGetName(node: TextView): String {
    return node.javaClass.simpleName
  }

  override fun onGetData(
      node: TextView,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {}
}

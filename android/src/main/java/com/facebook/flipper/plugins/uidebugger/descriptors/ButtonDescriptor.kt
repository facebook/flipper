/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.widget.Button
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

object ButtonDescriptor : ChainedDescriptor<Button>() {

  override fun onGetName(node: Button): String {
    return node.javaClass.simpleName
  }

  override fun onGetData(
      node: Button,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {}
}

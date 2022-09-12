/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.widget.TextView
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

object TextViewDescriptor : AbstractChainedDescriptor<TextView>() {

  override fun onGetId(textView: TextView): String {
    return Integer.toString(System.identityHashCode(textView))
  }

  override fun onGetName(textView: TextView): String {
    return textView.javaClass.simpleName
  }

  override fun onGetData(
      textView: TextView,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}
}

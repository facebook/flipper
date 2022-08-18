/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import android.content.res.Resources
import android.view.View

interface FragmentAccessor<FRAGMENT, FRAGMENT_MANAGER> {
  fun getFragmentManager(fragment: FRAGMENT): FRAGMENT_MANAGER?
  fun getResources(fragment: FRAGMENT): Resources?
  fun getId(fragment: FRAGMENT): Int
  fun getTag(fragment: FRAGMENT): String?
  fun getView(fragment: FRAGMENT): View?
  fun getChildFragmentManager(fragment: FRAGMENT): FRAGMENT_MANAGER?

  companion object {
    const val NO_ID = 0
  }
}

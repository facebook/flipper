/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

interface FragmentManagerAccessor<FRAGMENT_MANAGER, FRAGMENT> {
  fun getAddedFragments(fragmentManager: FRAGMENT_MANAGER): List<FRAGMENT>
}

/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies;

import java.util.List;
import javax.annotation.Nullable;

public interface FragmentManagerAccessor<FRAGMENT_MANAGER, FRAGMENT> {
  @Nullable
  List<FRAGMENT> getAddedFragments(FRAGMENT_MANAGER fragmentManager);
}

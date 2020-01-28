/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies;

import android.content.res.Resources;
import android.view.View;
import javax.annotation.Nullable;

public interface FragmentAccessor<FRAGMENT, FRAGMENT_MANAGER> {
  int NO_ID = 0;

  @Nullable
  FRAGMENT_MANAGER getFragmentManager(FRAGMENT fragment);

  Resources getResources(FRAGMENT fragment);

  int getId(FRAGMENT fragment);

  @Nullable
  String getTag(FRAGMENT fragment);

  @Nullable
  View getView(FRAGMENT fragment);

  @Nullable
  FRAGMENT_MANAGER getChildFragmentManager(FRAGMENT fragment);
}

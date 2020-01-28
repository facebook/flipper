/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies;

import android.app.Dialog;

public interface DialogFragmentAccessor<DIALOG_FRAGMENT, FRAGMENT, FRAGMENT_MANAGER>
    extends FragmentAccessor<FRAGMENT, FRAGMENT_MANAGER> {
  Dialog getDialog(DIALOG_FRAGMENT dialogFragment);
}

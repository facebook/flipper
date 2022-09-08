/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import android.app.Dialog

interface DialogFragmentAccessor<DIALOG_FRAGMENT, FRAGMENT, FRAGMENT_MANAGER> :
    FragmentAccessor<FRAGMENT, FRAGMENT_MANAGER> {
  fun getDialog(dialogFragment: DIALOG_FRAGMENT): Dialog?
}

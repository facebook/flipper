/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class FragmentTestActivity extends AppCompatActivity {
  @Override
  protected void onCreate(final Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    NavigationFacade.sendNavigationEvent("flipper://fragment_test_activity/");
    setContentView(com.facebook.flipper.sample.R.layout.fragment_test_activity);
  }
}

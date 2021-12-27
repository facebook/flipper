/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;
import androidx.test.runner.AndroidJUnit4;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class MainActivityTest {

  @Rule
  public final ActivityTestRule<MainActivity> mTestRule =
      new ActivityTestRule<>(MainActivity.class);

  @Test
  public void activityStarts() {
    final MainActivity activity = mTestRule.getActivity();

    assert activity != null;
  }
}

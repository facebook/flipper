/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.facebook.litho.Component;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.LithoView;
import com.facebook.litho.widget.Text;

public class DeepLinkActivity extends AppCompatActivity {

  @Override
  protected void onCreate(final Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    NavigationFacade.sendNavigationEvent("flipper://deep_link_activity/");

    final ComponentContext context = new ComponentContext(this);

    final Component component =
        Text.create(context).text("Welcome to the Deep Link Activity!").textSizeDip(40).build();

    setContentView(LithoView.create(context, component));
  }
}

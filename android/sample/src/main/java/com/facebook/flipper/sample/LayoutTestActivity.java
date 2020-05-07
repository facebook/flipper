/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.facebook.litho.Column;
import com.facebook.litho.Component;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.LithoView;
import com.facebook.litho.widget.Text;
import com.facebook.yoga.YogaEdge;
import com.facebook.yoga.YogaPositionType;

public class LayoutTestActivity extends AppCompatActivity {
  @Override
  protected void onCreate(final Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    NavigationFacade.sendNavigationEvent("flipper://layout_test_activity/");

    final ComponentContext context = new ComponentContext(this);

    final Component component =
        Column.create(context)
            .child(Text.create(context).text("This is a page to test layout").textSizeDip(20))
            .child(
                Text.create(context)
                    .text("This is another welcome text")
                    .textSizeDip(20)
                    .positionDip(YogaEdge.TOP, 10)
                    .positionType(YogaPositionType.ABSOLUTE))
            .build();

    setContentView(LithoView.create(context, component));
  }
}

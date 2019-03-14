/*
 *  Copyright (c) Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.sample;

import android.content.Intent;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.drawee.interfaces.DraweeController;
import com.facebook.flipper.android.diagnostics.FlipperDiagnosticActivity;
import com.facebook.litho.ClickEvent;
import com.facebook.litho.Column;
import com.facebook.litho.Component;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.StateValue;
import com.facebook.litho.annotations.LayoutSpec;
import com.facebook.litho.annotations.OnCreateLayout;
import com.facebook.litho.annotations.OnEvent;
import com.facebook.litho.annotations.OnUpdateState;
import com.facebook.litho.annotations.State;
import com.facebook.litho.fresco.FrescoImage;
import com.facebook.litho.widget.Text;

@LayoutSpec
public class RootComponentSpec {

  @OnCreateLayout
  static Component onCreateLayout(final ComponentContext c, @State boolean displayImage) {
    final DraweeController controller =
        Fresco.newDraweeControllerBuilder().setUri("https://fbflipper.com/img/icon.png").build();
    return Column.create(c)
        .child(
            Text.create(c)
                .text("Tap to hit get request")
                .key("1")
                .textSizeSp(20)
                .clickHandler(RootComponent.hitGetRequest(c)))
        .child(
            Text.create(c)
                .text("Tap to hit post request")
                .key("2")
                .textSizeSp(20)
                .clickHandler(RootComponent.hitPostRequest(c)))
        .child(
            Text.create(c)
                .text("Trigger Notification")
                .key("3")
                .textSizeSp(20)
                .clickHandler(RootComponent.triggerNotification(c)))
        .child(
            Text.create(c)
                .text("Diagnose connection issues")
                .key("4")
                .textSizeSp(20)
                .clickHandler(RootComponent.openDiagnostics(c)))
        .child(
            Text.create(c)
                .text("Load Fresco image")
                .key("5")
                .textSizeSp(20)
                .clickHandler(RootComponent.loadImage(c)))
        .child(displayImage ? FrescoImage.create(c).controller(controller) : null)
        .build();
  }

  @OnEvent(ClickEvent.class)
  static void hitGetRequest(final ComponentContext c) {
    ExampleActions.sendGetRequest();
  }

  @OnEvent(ClickEvent.class)
  static void hitPostRequest(final ComponentContext c) {
    ExampleActions.sendPostRequest();
  }

  @OnEvent(ClickEvent.class)
  static void triggerNotification(final ComponentContext c) {
    ExampleActions.sendNotification();
  }

  @OnEvent(ClickEvent.class)
  static void openDiagnostics(final ComponentContext c) {
    Intent intent = new Intent(c.getAndroidContext(), FlipperDiagnosticActivity.class);
    c.getAndroidContext().startActivity(intent);
  }

  @OnUpdateState
  static void updateDisplayImage(StateValue<Boolean> displayImage) {
    displayImage.set(true);
  }

  @OnEvent(ClickEvent.class)
  static void loadImage(final ComponentContext c) {
    RootComponent.updateDisplayImageAsync(c);
  }
}

/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.content.Intent;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.drawee.interfaces.DraweeController;
import com.facebook.flipper.android.diagnostics.FlipperDiagnosticActivity;
import com.facebook.flipper.sample.network.NetworkClient;
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
import com.facebook.yoga.YogaEdge;

@LayoutSpec
public class RootComponentSpec {

  @OnCreateLayout
  static Component onCreateLayout(final ComponentContext c, @State boolean displayImage) {
    final DraweeController controller =
        Fresco.newDraweeControllerBuilder().setUri("https://fbflipper.com/img/icon.png").build();
    return Column.create(c)
        .child(
            Text.create(c)
                .text("Send GET request")
                .key("1")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.hitGetRequest(c)))
        .child(
            Text.create(c)
                .text("Send POST request")
                .key("2")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.hitPostRequest(c)))
        .child(
            Text.create(c)
                .text("Trigger Notification")
                .key("3")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.triggerNotification(c)))
        .child(
            Text.create(c)
                .text("Diagnose connection issues")
                .key("4")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.openDiagnostics(c)))
        .child(
            Text.create(c)
                .text("Load Fresco image")
                .key("5")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.loadImage(c)))
        .child(
            Text.create(c)
                .text("Navigate to another page")
                .key("6")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.openAlternateActivityOne(c)))
        .child(
            Text.create(c)
                .text("Navigate to layout test page")
                .key("7")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.openAlternateLayoutTestActivity(c)))
        .child(
            Text.create(c)
                .text("Navigate to fragment test page")
                .key("8")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.openFragmentTestActivity(c)))
        .child(
            Text.create(c)
                .text("Crash this app")
                .key("9")
                .marginDip(YogaEdge.ALL, 10)
                .textSizeSp(20)
                .clickHandler(RootComponent.triggerCrash(c)))
        .child(
            displayImage
                ? FrescoImage.create(c)
                    .controller(controller)
                    .marginDip(YogaEdge.ALL, 10)
                    .widthDip(150)
                    .heightDip(150)
                : null)
        .build();
  }

  @OnEvent(ClickEvent.class)
  static void hitGetRequest(final ComponentContext c) {
    ExampleActions.sendGetRequest(NetworkClient.getInstance().getOkHttpClient());
  }

  @OnEvent(ClickEvent.class)
  static void hitPostRequest(final ComponentContext c) {
    ExampleActions.sendPostRequest(NetworkClient.getInstance().getOkHttpClient());
  }

  @OnEvent(ClickEvent.class)
  static void triggerNotification(final ComponentContext c) {
    ExampleActions.sendNotification();
  }

  @OnEvent(ClickEvent.class)
  static void openDiagnostics(final ComponentContext c) {
    final Intent intent = new Intent(c.getAndroidContext(), FlipperDiagnosticActivity.class);
    c.getAndroidContext().startActivity(intent);
  }

  @OnEvent(ClickEvent.class)
  static void openAlternateActivityOne(final ComponentContext c) {
    final Intent intent = new Intent(c.getAndroidContext(), DeepLinkActivity.class);
    c.getAndroidContext().startActivity(intent);
  }

  @OnEvent(ClickEvent.class)
  static void openAlternateLayoutTestActivity(final ComponentContext c) {
    final Intent intent = new Intent(c.getAndroidContext(), LayoutTestActivity.class);
    c.getAndroidContext().startActivity(intent);
  }

  @OnEvent(ClickEvent.class)
  static void openFragmentTestActivity(final ComponentContext c) {
    final Intent intent = new Intent(c.getAndroidContext(), FragmentTestActivity.class);
    c.getAndroidContext().startActivity(intent);
  }

  @OnEvent(ClickEvent.class)
  static void triggerCrash(final ComponentContext c) {
    throw new RuntimeException("Artificially triggered crash from Flipper sample app");
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

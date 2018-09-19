// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.sample;

import android.content.Intent;
import android.util.Log;
import com.facebook.litho.ClickEvent;
import com.facebook.litho.Column;
import com.facebook.litho.Component;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.annotations.LayoutSpec;
import com.facebook.litho.annotations.OnCreateLayout;
import com.facebook.litho.annotations.OnEvent;
import com.facebook.litho.widget.Text;
import com.facebook.flipper.android.diagnostics.SonarDiagnosticActivity;

import java.io.IOException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

@LayoutSpec
public class RootComponentSpec {

  @OnCreateLayout
  static Component onCreateLayout(final ComponentContext c) {
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
            .child(Text.create(c)
                .text("Diagnose connection issues")
                .key("3")
                .textSizeSp(20)
                .clickHandler(RootComponent.openDiagnostics(c)))
            .build();
  }

  @OnEvent(ClickEvent.class)
  static void hitGetRequest(final ComponentContext c) {

    final Request request =
        new Request.Builder().url("https://api.github.com/repos/facebook/yoga").get().build();
    FlipperSampleApplication.okhttpClient
        .newCall(request)
        .enqueue(
            new Callback() {
              @Override
              public void onFailure(final Call call, final IOException e) {
                e.printStackTrace();
                Log.d("Flipper", e.getMessage());
              }

              @Override
              public void onResponse(final Call call, final Response response) throws IOException {
                if (response.isSuccessful()) {
                  Log.d("Flipper", response.body().string());
                } else {
                  Log.d("Flipper", "not successful");
                }
              }
            });
  }

  @OnEvent(ClickEvent.class)
  static void hitPostRequest(final ComponentContext c) {

    final RequestBody formBody =
        new FormBody.Builder().add("app", "Flipper").add("remarks", "Its awesome").build();

    final Request request =
        new Request.Builder()
            .url("https://demo9512366.mockable.io/SonarPost")
            .post(formBody)
            .build();

    FlipperSampleApplication.okhttpClient
        .newCall(request)
        .enqueue(
            new Callback() {
              @Override
              public void onFailure(final Call call, final IOException e) {
                e.printStackTrace();
                Log.d("Flipper", e.getMessage());
              }

              @Override
              public void onResponse(final Call call, final Response response) throws IOException {
                if (response.isSuccessful()) {
                  Log.d("Flipper", response.body().string());
                } else {
                  Log.d("Flipper", "not successful");
                }
              }
            });
  }

    @OnEvent(ClickEvent.class)
    static void openDiagnostics(final ComponentContext c) {
        Intent intent = new Intent(c, SonarDiagnosticActivity.class);
        c.startActivity(intent);
    }
}

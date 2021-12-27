/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.util.Log;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.example.ExampleFlipperPlugin;
import java.io.IOException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public final class ExampleActions {

  public static void sendPostRequest(OkHttpClient client) {
    final RequestBody formBody =
        new FormBody.Builder().add("app", "Flipper").add("remarks", "Its awesome").build();

    final Request request =
        new Request.Builder()
            .url("https://demo9512366.mockable.io/SonarPost")
            .post(formBody)
            .build();

    client
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

  public static void sendGetRequest(OkHttpClient client) {
    final Request request =
        new Request.Builder().url("https://api.github.com/repos/facebook/yoga").get().build();
    client
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

  public static void sendNotification() {
    final FlipperClient client = AndroidFlipperClient.getInstanceIfInitialized();
    if (client != null) {
      final ExampleFlipperPlugin plugin = client.getPluginByClass(ExampleFlipperPlugin.class);
      plugin.triggerNotification();
    }
  }
}

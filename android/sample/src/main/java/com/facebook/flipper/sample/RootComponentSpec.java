// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.sample;

import android.util.Log;
import com.facebook.litho.ClickEvent;
import com.facebook.litho.Column;
import com.facebook.litho.Component;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.annotations.LayoutSpec;
import com.facebook.litho.annotations.OnCreateLayout;
import com.facebook.litho.annotations.OnEvent;
import com.facebook.litho.widget.Text;
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
  static Component onCreateLayout(ComponentContext c) {
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
                .text("I m just a text")
                .key("3")
                .textSizeSp(20))
        .build();
  }

@OnEvent(ClickEvent.class)
  static void hitGetRequest(ComponentContext c) {

        Request request = new Request.Builder()
            .url("https://api.github.com/repos/facebook/yoga")
            .get()
            .build();
       FlipperSampleApplication.okhttpClient.newCall(request).enqueue(new Callback() {
           @Override
           public void onFailure(Call call, IOException e) {
               e.printStackTrace();
               Log.d("Flipper", e.getMessage());
           }

           @Override
           public void onResponse(Call call, Response response) throws IOException {
               if (response.isSuccessful()) {
                   Log.d("Flipper", response.body().string());
               } else {
               Log.d("Flipper", "not successful");
           }
       }
   });
  }

  @OnEvent(ClickEvent.class)
  static void hitPostRequest(ComponentContext c) {

      RequestBody formBody = new FormBody.Builder()
              .add("app", "Flipper")
              .add("remarks", "Its awesome")
              .build();

        Request request = new Request.Builder()
            .url("https://demo9512366.mockable.io/SonarPost")
            .post(formBody)
            .build();

       FlipperSampleApplication.okhttpClient.newCall(request).enqueue(new Callback() {
           @Override
           public void onFailure(Call call, IOException e) {
               e.printStackTrace();
               Log.d("Flipper", e.getMessage());
           }

           @Override
           public void onResponse(Call call, Response response) throws IOException {
               if (response.isSuccessful()) {
                   Log.d("Flipper", response.body().string());
               } else {
               Log.d("Flipper", "not successful");
               }
           }
   });
  }
}

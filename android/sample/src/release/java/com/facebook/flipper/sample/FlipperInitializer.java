/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.content.Context;
import com.facebook.flipper.core.FlipperClient;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;

public final class FlipperInitializer {
  public interface InitializationResult {
    OkHttpClient getOkHttpClient();
  }

  public static InitializationResult initFlipperPlugins(Context context, FlipperClient client) {
    final OkHttpClient okHttpClient =
        new OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.MINUTES)
            .build();

    return new InitializationResult() {
      @Override
      public OkHttpClient getOkHttpClient() {
        return okHttpClient;
      }
    };
  }
}

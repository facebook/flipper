/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.network;

import okhttp3.OkHttpClient;

public class NetworkClient {
  private OkHttpClient mOkHttpClient;

  private NetworkClient() {}

  private static class Singleton {
    private static final NetworkClient INSTANCE = new NetworkClient();
  }

  public static NetworkClient getInstance() {
    return Singleton.INSTANCE;
  }

  public OkHttpClient getOkHttpClient() {
    return mOkHttpClient;
  }

  public void setOkHttpClient(OkHttpClient okHttpClient) {
    mOkHttpClient = okHttpClient;
  }
}

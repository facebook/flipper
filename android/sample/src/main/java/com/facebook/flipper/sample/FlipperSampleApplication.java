/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.app.Application;
import android.content.Context;
import android.database.DatabaseUtils;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.sample.network.NetworkClient;
import com.facebook.soloader.SoLoader;

public class FlipperSampleApplication extends Application {
  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);
    Fresco.initialize(this);

    final FlipperClient client = AndroidFlipperClient.getInstance(this);
    assert client != null;

    final FlipperInitializer.InitializationResult initializationResult =
        FlipperInitializer.initFlipperPlugins(this, client);

    NetworkClient.getInstance().setOkHttpClient(initializationResult.getOkHttpClient());

    getSharedPreferences("sample", Context.MODE_PRIVATE).edit().putString("Hello", "world").apply();
    getSharedPreferences("other_sample", Context.MODE_PRIVATE)
        .edit()
        .putInt("SomeKey", 1337)
        .apply();

    Database1Helper db1Helper = new Database1Helper(this);
    Database2Helper db2Helper = new Database2Helper(this);

    DatabaseUtils.queryNumEntries(db1Helper.getReadableDatabase(), "db1_first_table", null, null);
    DatabaseUtils.queryNumEntries(db2Helper.getReadableDatabase(), "db2_first_table", null, null);
  }
}

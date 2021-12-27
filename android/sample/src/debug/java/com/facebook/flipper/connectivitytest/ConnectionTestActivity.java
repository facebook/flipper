/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.connectivitytest;

import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.example.ExampleFlipperPlugin;

/**
 * Oh hai! This is probably not the kinda sample you want to copy to your application; we're just
 * using this to drive a test run and exit the app afterwards.
 */
public class ConnectionTestActivity extends AppCompatActivity {

  @Override
  protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    final FlipperClient client = AndroidFlipperClient.getInstanceIfInitialized();
    if (client != null) {
      // As we're re-using the identifier, get rid of the default plugin first.
      final ExampleFlipperPlugin exampleFlipperPlugin =
          client.getPluginByClass(ExampleFlipperPlugin.class);
      client.removePlugin(exampleFlipperPlugin);

      final ConnectionTestPlugin connectionTestPlugin = new ConnectionTestPlugin(this);
      client.addPlugin(connectionTestPlugin);
    }
  }
}

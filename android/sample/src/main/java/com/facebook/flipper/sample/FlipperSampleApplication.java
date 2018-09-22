// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.sample;

import android.app.Application;
import android.content.Context;
import com.facebook.litho.config.ComponentsConfiguration;
import com.facebook.soloader.SoLoader;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.leakcanary.LeakCanaryFlipperPlugin;
import com.facebook.flipper.plugins.litho.LithoSonarDescriptors;
import com.facebook.flipper.plugins.network.NetworkSonarPlugin;
import com.facebook.flipper.plugins.network.SonarOkhttpInterceptor;
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesSonarPlugin;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;

public class FlipperSampleApplication extends Application {

  public static OkHttpClient okhttpClient;

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);

    final FlipperClient client = AndroidFlipperClient.getInstance(this);
    final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();

    NetworkSonarPlugin networkPlugin = new NetworkSonarPlugin();
    SonarOkhttpInterceptor interceptor = new SonarOkhttpInterceptor(networkPlugin);

    okhttpClient = new OkHttpClient.Builder()
    .addNetworkInterceptor(interceptor)
    .connectTimeout(60, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .writeTimeout(10, TimeUnit.MINUTES)
    .build();

    // Normally, you would want to make this dependent on a BuildConfig flag, but
    // for this demo application we can safely assume that you always want to debug.
    ComponentsConfiguration.isDebugModeEnabled = true;
    LithoSonarDescriptors.add(descriptorMapping);
    client.addPlugin(new InspectorFlipperPlugin(this, descriptorMapping));
    client.addPlugin(networkPlugin);
    client.addPlugin(new SharedPreferencesSonarPlugin(this, "sample"));
    client.addPlugin(new LeakCanaryFlipperPlugin());
    client.start();

    getSharedPreferences("sample", Context.MODE_PRIVATE).edit().putString("Hello", "world").apply();
  }
}

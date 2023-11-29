/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.app.Application;
import android.content.Context;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin;
import com.facebook.flipper.plugins.databases.DatabasesFlipperPlugin;
import com.facebook.flipper.plugins.example.ExampleFlipperPlugin;
import com.facebook.flipper.plugins.fresco.FrescoFlipperPlugin;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.jetpackcompose.UIDebuggerComposeSupport;
import com.facebook.flipper.plugins.navigation.NavigationFlipperPlugin;
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin;
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin.SharedPreferencesDescriptor;
import com.facebook.flipper.plugins.uidebugger.UIDebuggerFlipperPlugin;
import com.facebook.flipper.plugins.uidebugger.core.UIDContext;
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister;
import com.facebook.flipper.plugins.uidebugger.litho.UIDebuggerLithoSupport;
import com.facebook.litho.config.ComponentsConfiguration;
import com.facebook.litho.editor.flipper.LithoFlipperDescriptors;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;

public final class FlipperInitializer {
  public interface InitializationResult {
    OkHttpClient getOkHttpClient();
  }

  public static InitializationResult initFlipperPlugins(Context context, FlipperClient client) {
    final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();

    final NetworkFlipperPlugin networkPlugin = new NetworkFlipperPlugin();
    final FlipperOkhttpInterceptor interceptor = new FlipperOkhttpInterceptor(networkPlugin, true);

    // Normally, you would want to make this dependent on a BuildConfig flag, but
    // for this demo application we can safely assume that you always want to debug.
    ComponentsConfiguration.isDebugModeEnabled = true;
    LithoFlipperDescriptors.add(descriptorMapping);
    client.addPlugin(new InspectorFlipperPlugin(context, descriptorMapping));
    client.addPlugin(networkPlugin);
    client.addPlugin(
        new SharedPreferencesFlipperPlugin(
            context,
            Arrays.asList(
                new SharedPreferencesDescriptor("sample", Context.MODE_PRIVATE),
                new SharedPreferencesDescriptor("other_sample", Context.MODE_PRIVATE))));
    client.addPlugin(new FrescoFlipperPlugin());
    client.addPlugin(new ExampleFlipperPlugin());
    client.addPlugin(CrashReporterPlugin.getInstance());
    client.addPlugin(new DatabasesFlipperPlugin(context));
    client.addPlugin(NavigationFlipperPlugin.getInstance());

    DescriptorRegister descriptorRegister = DescriptorRegister.Companion.withDefaults();
    UIDContext uidContext = UIDContext.Companion.create((Application) context);
    UIDebuggerLithoSupport.INSTANCE.enable(uidContext);
    UIDebuggerComposeSupport.INSTANCE.enable(uidContext);

    client.addPlugin(new UIDebuggerFlipperPlugin(uidContext));
    client.start();

    final OkHttpClient okHttpClient =
        new OkHttpClient.Builder()
            .addInterceptor(interceptor)
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

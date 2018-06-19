// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.sonar.sample;

import android.app.Application;
import android.net.Network;
import android.support.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;
import android.widget.LinearLayout.LayoutParams;
import android.widget.LinearLayout;
import android.widget.TextView;
// import com.facebook.litho.sonar.LithoSonarDescriptors;
import com.facebook.soloader.SoLoader;
import com.facebook.sonar.plugins.inspector.DescriptorMapping;
import com.facebook.sonar.plugins.inspector.InspectorSonarPlugin;
// import com.facebook.sonar.android.utils.SonarUtils;
import com.facebook.sonar.android.AndroidSonarClient;
import com.facebook.sonar.core.SonarClient;
// import com.facebook.sonar.plugins.inspector.DescriptorMapping;
// import com.facebook.sonar.plugins.inspector.InspectorSonarPlugin;
// import com.facebook.sonar.plugins.network.NetworkSonarPlugin;
// import com.facebook.sonar.plugins.network.SonarOkhttpInterceptor;
// import com.facebook.sonar.plugins.network.NetworkResponseFormatter;
// import okhttp3.OkHttpClient;
import java.util.concurrent.TimeUnit;

public class SonarSampleApplication extends Application {

  //static public OkHttpClient okhttpClient;

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);
    try {
        //SoLoader.loadLibrary("sonarfb");
        SoLoader.loadLibrary("sonarfb");
    } catch (Exception e) {
        throw new RuntimeException(e);
    }
    // final SonarClient client = AndroidSonarClient.getInstance(this);
    // final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();
    // client.addPlugin(new InspectorSonarPlugin(this, descriptorMapping));
    // client.start();
    // final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();
    //
    // NetworkSonarPlugin networkPlugin = new NetworkSonarPlugin();
    // SonarOkhttpInterceptor interceptor = new SonarOkhttpInterceptor(networkPlugin);
    //
    // okhttpClient = new OkHttpClient.Builder()
    // .addNetworkInterceptor(interceptor)
    // .connectTimeout(60, TimeUnit.SECONDS)
    // .readTimeout(60, TimeUnit.SECONDS)
    // .writeTimeout(10, TimeUnit.MINUTES)
    // .build();
    //
    // //LithoSonarDescriptors.add(descriptorMapping);
    // //client.addPlugin(new InspectorSonarPlugin(this, descriptorMapping));
    // client.addPlugin(networkPlugin);
    // client.start();
    }
}

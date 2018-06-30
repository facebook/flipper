// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.litho.sonar;

import com.facebook.litho.DebugComponent;
import com.facebook.litho.LithoView;
import com.facebook.sonar.plugins.inspector.DescriptorMapping;

public final class LithoSonarDescriptors {

  public static void add(DescriptorMapping descriptorMapping) {
    descriptorMapping.register(LithoView.class, new LithoViewDescriptor());
    descriptorMapping.register(DebugComponent.class, new DebugComponentDescriptor());
  }
}

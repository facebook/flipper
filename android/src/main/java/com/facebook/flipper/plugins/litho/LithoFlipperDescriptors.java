// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.plugins.litho;

import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.litho.DebugComponent;
import com.facebook.litho.LithoView;

public final class LithoFlipperDescriptors {

  public static void add(DescriptorMapping descriptorMapping) {
    descriptorMapping.register(LithoView.class, new LithoViewDescriptor());
    descriptorMapping.register(DebugComponent.class, new DebugComponentDescriptor());
  }
}
